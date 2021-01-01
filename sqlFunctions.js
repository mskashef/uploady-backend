const connection = require('./dbConnection');
const passwordHash = require('password-hash');

const execSQLCommand = (sql, result = () => {}, error = () => {}) => {
    const con = connection();
    con.connect((err) => {
        if (err) error(err);
        con.query(sql, (err, res) => {
            if (err) error(err);
            result(res);
        });
    });
};

const getUser = (username, result = () => {}, error = () => {}) => {
    execSQLCommand(`select * from users where username='${username}'`, res => result(res), err => error(err));
};

const addUser = (username, password, result = () => {}, error = () => {}) => {
    execSQLCommand(`insert into users (username, password) values ('${username}', '${passwordHash.generate(password)}')`, res => result(res), err => error(err));
};

const addFile = (fileName, displayFileName, shortId, owner, fid, version, size, result = () => {}, error = () => {}) => {
    console.log(`insert into versions (name, display_name, src, version, fid, size) values ('${fileName}', '${displayFileName}','/files/${owner}/${fileName}', '${version}', '${fid}', '${size}')`)
    execSQLCommand(`insert into files (shortId, owner, fid) values ('${shortId}', '${owner}', ${fid})`, res => {
        execSQLCommand(`insert into versions (name, display_name, src, version, fid, size) values ('${fileName}', '${displayFileName}','/files/${owner}/${fileName}', '${version}', '${fid}', '${size}')`, res => {
            result(res)
        }, err => error(err));
    }, err => error(err));
};

const updateFile = (fileName, displayFileName, shortId, owner, fid, version, size, result = () => {}, error = () => {}) => {
    execSQLCommand(`insert into versions (name, display_name, src, version, fid, size) values ('${fileName}', '${displayFileName}', '/files/${owner}/${fileName}', '${version}', '${fid}', '${size}')`, res => {
        result(res)
    }, err => error(err));
};

const deleteFile = (fid, vid, result = () => {}, error = () => {}) => {
    execSQLCommand(`delete from versions where fid='${fid}'and vid='${vid}'`, res => {
        result(res)
    }, err => error(err));
};

const fileExists = (fid, result = () => {}, error = () => {}) => {
    execSQLCommand(`select * from files join versions on files.fid=versions.fid where files.fid='${fid}'`, res => result(res), err => error(err));
};

const getFileVersions = (fid, result = () => {}, error = () => {}) => {
    execSQLCommand(
        `select * from versions where fid='${fid}'`, res => result(res), err => error(err));
};

const getMyFiles = (username, result = () => {}, error = () => {}) => {
    execSQLCommand(
        `select * from files join versions on files.fid=versions.fid where owner='${username}'`,
        res => result(res),
        err => error(err)
    );
};

module.exports = {addUser, getUser, addFile, getMyFiles, updateFile, deleteFile, fileExists, getFileVersions};
