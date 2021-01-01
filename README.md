# Uploady Deployment Guide
Follow these steps to deploy this REST API on a server or etc.
1. Download and install `Node.js`
2. Run this command on your terminal `node server.js` to start the server

# Supported Functionalities
1. JWT User Authentication
2. File Upload
3. File Download
4. Can have different versions of a file
5. Delete File
6. Image Resize
7. Download Partial Content using `Range` Header
8. URL Shortener

# Uploady REST API Document

## SignUp & Login


**Method:** `POST`

**Url:** `/api/login`

**Parameters :** 

| Param's name | type   | required |
| ------------ | ------ | -------- |
| username     | string | true     |
| password     | string | true     |

**Responses:** 

**200 :**

success:
```json
{
    "success": true,
    "msg": "Signed up successfully!",
}
```

fail:

```json
{
    "success": false,
    "msg": "Wrong Username / Password!"
}
```
## Logout

**Method:** `DELETE`

**Url:** `/api/logout`

**Responses:** 

**200 :**
no response data!

## getMyFiles

**Method:** `GET`

**Url:** `/api/getMyFiles`

(User must be Authenticated)

**Responses:** 

**200 :**
```json
[
    {
        "fid": "1608962797696",
        "name": "Picture1.png",
        "owner": "msk",
        "shortId": "skfNVE4",
        "size": 56856,
        "src": "/files/msk/Picture1.png",
        "upload_date": "2020-12-26T06:06:37.879Z",
        "version": "v1",
        "vid": 15
    },
    ...
]
```


## fileExists

**Method:** `GET`

**Url:** `/api/fileExists/{fid}`

**Responses:** 

**200 :**
```
{
    exists: "1" [OR "0"]
}
```

## getFileVersions

**Method:** `GET`

**Url:** `/api/getFileVersions/{fid}`

**Responses:** 

**200 :**

```json
[
    {
        "fid": "1608962810366",
        "name": "Picture7.png",
        "size": 85162,
        "src": "/files/msk/Picture7.png",
        "upload_date": "2020-12-26T06:06:50.458Z",
        "version": "v1",
        "vid": 16
    },
    ...
]
```

## fileUpload

**Method:** `POST`

**Url:** `/api/upload`

(User must be Authenticated)

**Parameters :** 

| Param's name | type   | required |
| ------------ | ------ | -------- |
| file         | file   | true     |
| version      | string | true     |
| updateFor    | string | false    |


**Responses:** 

**200 :**
no response data

**500 :**
no response data

## DeleteFile


**Method:** `DELETE`

**Url:** `/api/deleteFile/{fid}/{vid}`

(User must be Authenticated)

**Responses:** 

**200 :**
no response data

**501 :**
no response data

## Download File

**Method:** `GET`

**Supports Header Range:** like: `Range: bytes=0-1024`

**Url:** `/files/{owner}/{vid}`

**Responses:** 

**200 :**
Partial Content: File

**400 :**
no response data

## Download Re-sized File

**Method:** `GET`

**Supports Header Range:** like: `Range: bytes=0-1024`

**Url:** `/files/{owner}/{vid}/size`

**Params:**

`percentage`: number from 1 to 500 (in '%' unit)

**Responses:** 

**206 :**
Partial Content: File

**400 :**

"Percentage must be between 1 and 500!"

or

"File not resizable!"
