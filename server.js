// ----------------------------------------------- Imports & Configs -----------------------------------------------

const {addUser, getUser, addFile, getMyFiles, updateFile, deleteFile, fileExists, getFileVersions} = require('./sqlFunctions');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const range = require('express-range');
const fileUpload = require('express-fileupload');
const passwordHash = require('password-hash');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
var sizeOf = require('image-size');
const sharp = require("sharp");
const fs = require('fs');
const app = express();
app.use(session({secret: 'keyboard cat', cookie: {maxAge: 365 * 24 * 60 * 60 * 1000}}));
app.use(session({secret: '1234', saveUninitialized: true, resave: true}));
app.use(cookieParser());
app.use(cors());
app.use(fileUpload());
app.use(express.json());        // to support JSON-encoded bodies
app.use(express.urlencoded());  // to support URL-encoded bodies
app.use(range({accept: 'bytes'}));

const secret = process.env.KEY;

// ----------------------------------------------- Functions -----------------------------------------------

const redirectLogin = (req, res, next) => {
    const token = req.cookies?.uploadyToken;
    if (token == null) return res.json({redirect: '/auth'});
    jwt.verify(token, secret, (err, user) => {
        if (err) return res.json({redirect: '/auth'});
        req.user = user;
        next();
    });
};

const encode = (n) => {
    let res = '';
    let map = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    while (n !== 0) {
        let rem = n % map.length;
        res = map[rem] + res;
        n = Math.floor(n / map.length);
    }
    return res;
};

const getFileExtension = (file) => {
    if (file.name.includes('.'))
        return '.' + file.name.slice(file.name.lastIndexOf('.') + 1);
    return '';
};

const isImage = (fileName) => {
    if (!fileName || !fileName.includes('.')) return false;
    return ['png', 'jpg', 'jpeg', 'bmp'].includes(fileName.slice(fileName.lastIndexOf('.') + 1));
};

// ----------------------------------------------- API EndPoints -----------------------------------------------

app.post('/api/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const user = {name: username};

    getUser(username, result => {
        if (result.length > 0) {
            // User Exists
            if (passwordHash.verify(password, result[0].password)) {
                jwt.sign(user, secret, (err, token) => {
                    res.cookie('uploadyToken', token);
                    res.cookie('username', username);
                    res.json({success: true, msg: 'Logged in successfully!'})
                });
            } else res.json({success: false, msg: 'Wrong Username / Password!'});
        } else {
            // Create New User
            addUser(username, password, res => {
                jwt.sign(user, secret, (err, token) => {
                    res.cookie('uploadyToken', token);
                    res.cookie('username', username);
                    res.json({success: true, msg: 'Signed up successfully!'})
                });
            }, err => res.sendStatus(501));
        }
    }, err => {
        res.sendStatus(500);
    })
});

app.delete('/api/logout', (req, res) => {
    res.cookie('uploadyToken', '', {maxAge: -1});
    res.cookie('username', '', {maxAge: -1});
    res.sendStatus(200);
});

app.post('/api/upload', redirectLogin, async (req, res) => {
    let file = req.files.file;
    let owner = req.user.name;
    if (file.size > 1 * 1024 * 1024 * 1024 /*1GB*/)
        return res.json({error: 'File can not be larger than 1GB!'});
    let updateFor = req.body.updateFor;
    let version = req.body.version;
    let fileName = new Date().getTime() + getFileExtension(file);
    if (!fs.existsSync(`${__dirname}/files/${owner}`)) fs.mkdirSync(`${__dirname}/files/${owner}`);
    file.mv(`${__dirname}/files/${owner}/${fileName}`, err => {
        if (err) return res.sendStatus(500);
        const fid = new Date().getTime();
        const shortId = encode(fid);
        if (updateFor) {
            updateFile(fileName, file.name, shortId, owner, updateFor, version, file.size);
        } else {
            addFile(fileName, file.name, shortId, owner, fid, version, file.size);
        }
        res.sendStatus(200);
    });
});

app.delete('/api/deleteFile/:fid/:vid', redirectLogin, (req, res) => {
    fid = req.params.fid;
    vid = req.params.vid;
    deleteFile(fid, vid, result => res.sendStatus(200), err => res.sendStatus(501));
});

app.get('/api/getMyFiles', redirectLogin, (req, res) => {
    getMyFiles(req.user.name, result => {
        res.json(result);
    }, err => res.sendStatus(501))
});

app.get('/api/fileExists/:fid', (req, res) => {
    fileExists(req.params.fid, result => {
        res.json({
            exists: result.length > 0 ? '1' : '0'
        });
    }, err => res.sendStatus(500));
});

app.get('/api/getFileVersions/:fid', (req, res) => {
    getFileVersions(req.params.fid, result => {
        res.send(result);
    }, err => res.sendStatus(500));
});

app.get('/files/:owner/:fileName', (req, res) => {
    const range = req.headers.range;
    const owner = req.params.owner;
    const fileName = req.params.fileName;
    const fileUrl = `${__dirname}/files/${owner}/${fileName}`;
    const fileSize = fs.lstatSync(fileUrl).size;
    if (range) {
        res.status(206);
        res.set('Connection', 'keep-alive');
        const [start, end] = range.split('=')[1].split('-');
        const size = fs.lstatSync(fileUrl).size;
        res.set("Content-Range", "bytes " + start + "-" + end + "/" + size);
        res.set("Accept-Ranges", "bytes");
        let length = end - start + 1;
        res.set("Content-Length", length);
        fs.createReadStream(fileUrl, {start: Number(start), end: Number(end)}).pipe(res);
    } else {
        res.status(206);
        res.set("Content-Length", fileSize);
        res.set("Content-Range", "bytes 0-" + fileSize + "/" + fileSize);
        fs.createReadStream(fileUrl, {start: 0, end: fileSize}).pipe(res);
    }
});

app.get('/files/:owner/:fileName/resize', (req, res) => {
    const range = req.headers.range;
    const owner = req.params.owner;
    const fileName = req.params.fileName;
    const percentage = Number(req.query.percentage);

    if (!percentage || percentage < 1 || percentage > 500)
        return res.status(400).send("Percentage must be between 1 and 500!");

    if (!isImage(fileName))
        return res.status(400).send("File not resizable!");

    const fileUrl = `${__dirname}/files/${owner}/${fileName}`;
    const dimensions = sizeOf(fileUrl);
    const fileWidth = dimensions.width;

    const uniqName = Math.random() + '_' + new Date().getTime() + '_' + Math.random();
    const newURL = `${__dirname}/files/resizeStore/${uniqName}.png`;

    sharp(fileUrl).resize(Math.round(fileWidth * percentage / 100)).toFile(newURL).then((data) => {
        let newFileDetails = fs.lstatSync(newURL);
        const newFileSize = newFileDetails.size;
        if (range) {
            res.status(206);
            res.set('Connection', 'keep-alive');
            const [start, end] = range.split('=')[1].split('-');
            const size = fs.lstatSync(newURL).size;
            res.set("Content-Range", "bytes " + start + "-" + end + "/" + size);
            res.set("Accept-Ranges", "bytes");
            let length = end - start + 1;
            res.set("Content-Length", length);
            const readStream = fs.createReadStream(newURL, {start: Number(start), end: Number(end)});
            readStream.pipe(res);
            readStream.on('finish' , () => fs.unlinkSync(newURL))
        } else {
            res.status(206);
            res.set("Content-Length", newFileSize);
            res.set("Content-Range", "bytes 0-" + newFileSize + "/" + newFileSize);
            const readStream = fs.createReadStream(newURL, {start: 0, end: newFileSize});
            readStream.pipe(res);
            readStream.on('finish' , () => fs.unlinkSync(newURL))
        }
    });
});

// ----------------------------------------------- Server Start -----------------------------------------------

app.listen(5000);
