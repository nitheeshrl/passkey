const express = require('express')
const crypto = require("node:crypto");
const base64url = require('base64url');
const mongoose = require ("mongoose")
const Binary = require('binary')
const url = 'mongodb+srv://niftem:Niftem%40iac@niftem-t.lnsqf.mongodb.net/User-Passkey';
const conenctDB = async()=>{
await mongoose.connect (url)
console.log(`the db is connect with ${mongoose.connection.host}`)



}
conenctDB()
function timeout(){
    var i = 30;

function startTimer() {

    var countdownTimer = setInterval(function() {

        console.log("Delay timeout in "+i);
        i = i - 1;

        if (i <= 0) {
            clearTimeout(countdownTimer);
        }

    }, 1000);

}
    startTimer()
    
}
setInterval(timeout,13*60*1000);
timeout()
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


app.listen(PORT, () => console.log(`Server started on PORT:${PORT}`))
