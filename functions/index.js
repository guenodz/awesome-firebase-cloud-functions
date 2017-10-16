'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');

// Initialize the firebase admin instance
admin.initializeApp(functions.config().firebase);

// Create a new Express app
const app = express();

// Get all posts
app.get('/posts', (req, res) => {
    return admin.database().ref('/posts').once('value').then(snapshot => {
        if (snapshot.exists()) {
            res.status(200).json(snapshot.val());
        } else {
            res.status(404).send('Posts not found');
        }
    }).catch(error => {
        console.error('Error getting posts', error.message);
        res.sendStatus(500);
    });
});

// Get post with ID
app.get('/posts/:postID', (req, res) => {
    const postID = parseInt(req.params.postID);
    var ref = admin.database().ref('/posts');
    if (!postID)
        return;

    return ref.orderByChild('id').equalTo(postID).once('value').then(snapshot => {
        if (snapshot.exists()) {
            res.status(200).json(snapshot.val());
        } else {
            res.status(404).send('Post with ID: ${postID} not found');
        }
    }).catch(error => {
        console.error('Error getting post details', postID, error.message);
        res.sendStatus(500);
    });

});

// Export the API as a function, so once deployed we can use https://YOUR_FIRBASE_URL/api/ as an endpoint for our REST methods
exports.api = functions.https.onRequest(app);

// Listen for new database changes (create) and send a notification to users once a new post is added to the database
exports.sendNewPostNotificaion = functions.database.ref('/posts/{postID}').onCreate(event => {

    // Extract the new post data
    const newPost = event.data.current.val();

    // Create the notification payload
    const payload = {
        notification: {
            title: newPost.title,
            body: newPost.content,
            sound: 'default'
        }
    };

    // Send the notification to all users that are subscribed to topic: 'posts_topic'
    return admin.messaging().sendToTopic('posts_topic', payload)
        .then(response => {
            console.info('Successfully sent message: ', response);
        }).catch(error => {
            console.error('Error sending message: ', error);
        });

});