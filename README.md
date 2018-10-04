# APIdaze WebRTC + voice/video conferencing + Firebase
This is an example of how to build WebRTC + telecom applications with APIdaze
and Firebase.

# Want to build your own ?

This application is deployed to https://apidaze-example.firebaseapp.com.
If you'd like to host this code, you just need to set up your own Firebase web
application and clone/deploy this repository. You will also need to have
an application created at APIdaze (https://voipinnovations.com/programmable).

## Create your Firebase application

A Firebase application needs to be attached to this repository and therefore it
must exist before proceeding to the next step. The creation process is
straightforward, check : https://firebase.google.com/docs/web/setup

## Get the repository, start your server, deploy

Make sure you have the `firebase-tools` NPM module installed globally :
```
$ npm install -g firebase-tools
```
Then proceed with logging in
```
$ firebase login
```
And initialize, then start your application locally
```
$ git clone https://github.com/apidaze/firebase_example.git
$ cd firebase_example
$ firebase init
...
# Step 1 : make sure to check Database, Functions, Hosting
# Step 2 : select the Firebase application you just created
# Step 3 : do not overwrite files when asked
# Step 5 : answer Yes to install NPM dependencies for Functions
# Step 6 : use 'public' as the directory to use as the public dir
...
$ firebase serve # Start development server
```
Ready to deploy to your application ? Simply issue :
```
$ firebase deploy # Use the Function URL as your External Script in APIdaze (see next step)
```

# Tell APIdaze that your application is controlled

The URL that has been created as a Function URL needs to be used
in APIdaze as your External Script. It should look like this :
`https://us-central1-name-of-your-firebase-application.cloudfunctions.net/apidazeExternalScript`

Just copy and pasted it when you create your External Script at VoIP Innovations: https://voipinnovations.com/programmable

# Control application from the Firebase database

The Firebase console lets you access the database of your application. You will
need to set the two attributes to your application in your Firebase database :
- `apikey` : the API key of your application at APIdaze
- `number` : a phone number from APIdaze to route to this page
