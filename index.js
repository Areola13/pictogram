"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const app = express();
const PORT = 3000;
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const fs = require('fs');
const DB_FILEPATH = './storage/db.json';
// ------------------  FOR FILE UPLOAD --------------------------//
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${__dirname}/storage/uploads/`);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });
const http = require('http');
const https = require('https');
const Stream = require('stream').Transform;
var download = (url, filename) => {
    var client = http;
    if (url.toString().indexOf("https") === 0) {
        client = https;
    }
    client.request(url, function (response) {
        var data = new Stream();
        response.on('data', function (chunk) {
            data.push(chunk);
        });
        response.on('end', function () {
            fs.writeFileSync(filename, data.read());
        });
    }).end();
};
// ---------------------------------------------------------------------//
app.get('/user', (req, res) => {
    var _a;
    const SERVER_URL = req.protocol + '://' + req.get('host');
    const db = require(DB_FILEPATH);
    const uploadPath = `${SERVER_URL}/uploads/`;
    const user = db.users.find(user => user.user_id == req.query.user_id);
    user.image = (_a = user.image) === null || _a === void 0 ? void 0 : _a.replace(uploadPath, '');
    user.image = `${SERVER_URL}/uploads/${user.image || 'profile.png'}`;
    user.posts = db.posts.filter(post => post.user_id == req.query.user_id)
        .map(post => {
        var _a;
        if (post.image) {
            post.image = (_a = post.image) === null || _a === void 0 ? void 0 : _a.replace(uploadPath, '');
            post.image = `${SERVER_URL}/uploads/${post.image}`;
        }
        return post;
    });
    res.json(user);
});
app.post('/user/create', (req, res) => {
    // if has photoURL, save it to uploads folder
    let profileImage = 'profile.png';
    if (req.body.photoURL) {
        profileImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-profile.png';
        download(req.body.photoURL, `./storage/uploads/${profileImage}`);
    }
    const db = require(DB_FILEPATH);
    const newUserData = {
        user_id: req.body.user_id,
        name: req.body.name,
        image: profileImage
    };
    db.users.push(newUserData);
    fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
        if (err)
            throw err;
        res.json(newUserData);
    });
});
// multer can't handle file uploading for PUT request
// if you want to update with file(s), use POST request instead
app.post('/user/update', upload.single('image'), (req, res) => {
    const db = require(DB_FILEPATH);
    const userIndex = db.users.findIndex(user => user.user_id === req.body.user_id);
    if (userIndex >= 0) {
        db.users[userIndex].name = req.body.name;
        db.users[userIndex].image = req.file.filename;
        fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
            if (err)
                throw err;
            res.json(db.users[userIndex]);
        });
    }
    else {
        res.status(404).send('Not found');
    }
});
app.post('/post/create', upload.single('image'), (req, res) => {
    const db = require(DB_FILEPATH);
    const newPostData = {
        post_id: Math.round(Math.random() * 1E9),
        user_id: req.body.user_id,
        content: req.body.content,
        image: req.file.filename,
        likes: [],
        comments: [],
    };
    db.posts.push(newPostData);
    fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
        if (err)
            throw err;
        res.json(newPostData);
    });
});
app.post('/post/update', upload.single('image'), (req, res) => {
    const db = require(DB_FILEPATH);
    const postIndex = db.posts.findIndex(post => post.post_id == req.body.post_id);
    if (postIndex >= 0) {
        let updatedPostdata = Object.assign(Object.assign({}, db.posts[postIndex]), { content: req.body.content });
        if (req.file) {
            updatedPostdata.image = req.file.filename;
        }
        fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
            if (err)
                throw err;
            res.json(updatedPostdata);
        });
    }
    else {
        res.status(404).send('Not found');
    }
});
app.delete('/post/delete', (req, res) => {
    const db = require(DB_FILEPATH);
    db.posts = db.posts.filter(post => post.post_id != req.query.post_id);
    fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
        if (err)
            throw err;
        res.send('Success');
    });
});
app.post('/comment/create', (req, res) => {
    const db = require(DB_FILEPATH);
    const postIndex = db.posts.findIndex(post => post.post_id == req.body.post_id);
    if (postIndex >= 0) {
        const commentData = {
            user_id: req.body.user_id,
            content: req.body.content,
        };
        db.posts[postIndex].comments.push(commentData);
        fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
            if (err)
                throw err;
            res.json(commentData);
        });
    }
    else {
        res.status(404).send('Not found');
    }
});
app.patch('/like', (req, res) => {
    const db = require(DB_FILEPATH);
    const postIndex = db.posts.findIndex(post => post.post_id == req.query.post_id);
    if (postIndex >= 0 && !db.posts[postIndex].likes.includes(req.query.user_id)) {
        db.posts[postIndex].likes.push(req.query.user_id);
        fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
            if (err)
                throw err;
            res.send('Success');
        });
    }
    else {
        res.status(404).send('Not found');
    }
});
app.patch('/dislike', (req, res) => {
    const db = require(DB_FILEPATH);
    const postIndex = db.posts.findIndex(post => post.post_id == req.query.post_id);
    if (postIndex >= 0) {
        db.posts[postIndex].likes = db.posts[postIndex].likes.filter(user_id => user_id != req.query.user_id);
        fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
            if (err)
                throw err;
            res.send('Success');
        });
    }
    else {
        res.status(404).send('Not found');
    }
});
app.patch('/follow', (req, res) => {
    const db = require(DB_FILEPATH);
    const userIndex = db.users.findIndex(user => user.user_id == req.query.user_id);
    if (userIndex >= 0) {
        db.users[userIndex].followed.push(req.query.follow_user_id);
        fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
            if (err)
                throw err;
            res.send('Success');
        });
    }
    else {
        res.status(404).send('Not found');
    }
});
app.patch('/unfollow', (req, res) => {
    const db = require(DB_FILEPATH);
    const userIndex = db.users.findIndex(user => user.user_id == req.query.user_id);
    if (userIndex >= 0) {
        db.users[userIndex].followed = db.users[userIndex].followed.filter(user_id => user_id != req.query.follow_user_id);
        fs.writeFile(`${DB_FILEPATH}`, JSON.stringify(db), (err) => {
            if (err)
                throw err;
            res.send('Success');
        });
    }
    else {
        res.status(404).send('Not found');
    }
});
app.get('/newsfeed', (req, res) => {
    const db = require(DB_FILEPATH);
    const SERVER_URL = req.protocol + '://' + req.get('host');
    const uploadPath = `${SERVER_URL}/uploads/`;
    const user = db.users.find(user => user.user_id === req.query.user_id);
    const posts = db.posts.filter(post => user.followed.includes(post.user_id) || post.user_id == user.user_id)
        .map(post => {
        var _a;
        post.comments = post.comments.map(comment => {
            comment.user = db.users.find(u => u.user_id == comment.user_id);
            return comment;
        });
        if (post.image) {
            post.image = (_a = user.image) === null || _a === void 0 ? void 0 : _a.replace(uploadPath, '');
            post.image = `${SERVER_URL}/uploads/${user.image || 'profile.png'}`;
        }
        return post;
    });
    res.json(posts);
});
app.get('/uploads/:file', (req, res) => {
    res.sendFile(`${__dirname}/storage/uploads/${req.params.file}`);
});
app.listen(PORT, () => console.log(`App listening on port ${PORT}!`));
