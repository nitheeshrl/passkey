const express = require('express')
const crypto = require("node:crypto");
const base64url = require('base64url');
const mongoose = require ("mongoose")
const Binary = require('binary')
const bcrypt = require('bcrypt');
const webpush = require('web-push');
const url = 'mongodb+srv://niftem:Niftem%40iac@niftem-t.lnsqf.mongodb.net/User-Passkey';
const conenctDB = async()=>{
await mongoose.connect (url)
console.log(`the db is connect with ${mongoose.connection.host}`)



}
conenctDB()
const apiKeys = {
    publicKey: "BKZKjQJLUXjA8vv0Dz4_j5nsP03q7Fpp7M3FGAuznw5bsuqRkjO52NMIEdsyP3jKh5wxY1xs9gKZjAGhqjDyNVY",
    privateKey: "_McdUWYvONDviXYBNrsoUhGE3iZ-TS9RjVVIdhayQg8"
}

webpush.setVapidDetails(
    'mailto:iacniftemt@gmail.com',
    apiKeys.publicKey,
    apiKeys.privateKey
)
function timeout(){
console.log("Checking")
}
setInterval(timeout,60*1000);
const { 
    generateRegistrationOptions, 
    verifyRegistrationResponse, 
    generateAuthenticationOptions, 
    verifyAuthenticationResponse 
} = require('@simplewebauthn/server')


const cors=require("cors");
const corsOptions ={
   origin:'*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}
if (!globalThis.crypto) {
    globalThis.crypto = crypto;
}

const PORT = 3000
const app = express();
app.use(express.static('./public'));
app.use(cors(corsOptions))
app.use(express.json())

// States
const userStore = {}

const challengeStore = {}


app.post('/register-challenge', async (req, res) => {
    const { username, weburl } = req.body

    const user = {
        username,

    }

    userStore[username] = user
    const challengePayload = await generateRegistrationOptions({
        rpID: weburl,
        rpName: 'NIFTEM-T Placement Cell',
        attestationType: 'none',
        userName: username,
        timeout: 30_000,
    })
    return res.json({ options: challengePayload })

})

app.post('/register-verify', async (req, res) => {
    const { username, cred, challenge, devUniId, weburl, urlorigin }  = req.body
 
    const verificationResult = await verifyRegistrationResponse({
        expectedChallenge: challenge,
        expectedOrigin: urlorigin,
        expectedRPID: weburl,
        response: cred,
    })

    if (!verificationResult.verified) return res.json({ error: 'could not verify' });
    var conn = mongoose.connection;
    var user = {
        name: username,
        devUniId,
        weburl,
        urlorigin,
        passkey: verificationResult.registrationInfo,
        transport: req.body.transports,
    };
    var insresult = conn.collection('Users').insertOne(user);

    userStore[username].passkey = verificationResult.registrationInfo
     var ff = {
        publicKey: verificationResult.registrationInfo.credentialPublicKey,
     }
     userStore[username].passkey = ff
    return res.json({ verified: true, info: verificationResult.registrationInfo,result: user})


})

app.post('/login-challenge', async (req, res) => {
    var { userId, weburl } = req.body

    const opts = await generateAuthenticationOptions({
        rpID: weburl,
    })



    return res.json({ options: opts })
})


app.post('/login-verify', async (req, res) => {
    const { userId, cred, challenge, devUniId, weburl, urlorigin }  = req.body
let findresult ;
console.log(userId)
var conn = mongoose.connection;
    findresult = await conn.collection('Users').findOne({name: userId, devUniId:devUniId});
        if (findresult == null){
        return res.json({ success: false, userId })
    }
    var key = new Uint8Array(findresult.passkey.credentialPublicKey.buffer);
    console.log(key)

 userStore[userId] = findresult;
 var user = userStore[userId]

    const result = await verifyAuthenticationResponse({
        expectedChallenge: challenge,
        expectedOrigin: urlorigin,
        expectedRPID: weburl,
        response: cred,
        authenticator: {

            credentialPublicKey: key
        }
    })

    if (!result.verified) return res.json({ error: 'something went wrong' })
    
    // Login the user: Session, Cookies, JWT
    return res.json({ success: true, userId })
})
app.post("/hash", async (req, res) => {
    const { password } = req.body;
   console.log(password)
      const start = Date.now();
  
      // genSalt
      const salt = await bcrypt.genSalt(10)
      console.log('salt: ' + salt);
      console.log('salt cb end: ' + (Date.now() - start) + 'ms');
  
      // hash
      const crypted = await bcrypt.hash(password, salt) 
      console.log('crypted: ' + crypted);
      console.log('crypted cb end: ' + (Date.now() - start) + 'ms');
      console.log('rounds used from hash:', bcrypt.getRounds(crypted));
  
      // compare
      const res11 = await bcrypt.compare(password, crypted)
      console.log('compared true: ' + res);
      console.log('compared true cb end: ' + (Date.now() - start) + 'ms');
  
  
      console.log('end: ' + (Date.now() - start) + 'ms');
      console.log(crypted)
      console.log(crypted)
      res.json({
        hash: crypted,
        salt: salt
  
  });
   
     
  
  
  
  })
  app.post("/dehash", async (req, res) => {
    const { password } = req.body;
    const { salt } = req.body;
   console.log(password)
      const start = Date.now();
      // hash
      const crypted = await bcrypt.hash(password, salt) 
      console.log('crypted: ' + crypted);
      console.log('crypted cb end: ' + (Date.now() - start) + 'ms');
      console.log('rounds used from hash:', bcrypt.getRounds(crypted));
  
      console.log('end: ' + (Date.now() - start) + 'ms');
      console.log(crypted)
      console.log(crypted)
      res.json({
        hash: crypted
  
  });
   })
   app.get("/", (req, res) => {
    res.send("Hello world");
})

const subDatabse = [];


app.post("/save-subscription", async (req, res) => {
  const   {username,  subscription } = (req.body);
  console.log(username);
    var conn = mongoose.connection;
    var no = await conn.collection('Notifications').countDocuments({subscription: subscription});
    if(no == 0){
    var user = {
username,
        subscription
    };

    var insresult = conn.collection('Notifications').insertOne(user);

    res.json({ status: "Success", message: "Subscription saved!" })
}
else if(no == 1){
   await conn.collection('Notifications').updateOne({subscription:subscription},{$set:{subscription:subscription}})   ;
   res.json({ status: "Updated", message: "Subscription updated!" })
}
else{
res.json({ status: "Duplicate", message: "Already Saved!" })
}
})

app.post("/send-notification", async (req, res) => {
    var   { username, message } = (req.body);
    console.log(username,message)
    var results = [];   
    var conn = mongoose.connection;
 var findresult = await conn.collection('Notifications').find({username: username})    ;
 var no = await conn.collection('Notifications').countDocuments({username: username});
var results = await findresult.toArray();
   
if (no !==0){

for ( var result of results){
    console.log(result)
    webpush.sendNotification(result.subscription, message);
}
}
    res.json({ "statue": "Success", "message": "Message sent to push service" });
})


app.listen(PORT, () => console.log(`Server started on PORT:${PORT}`))
