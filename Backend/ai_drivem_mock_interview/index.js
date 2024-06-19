import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express, { text } from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
dotenv.config();
import multer from "multer";
import path from "path";
import * as fsd from 'fs';
import sharp from "sharp";
import * as tf from '@tensorflow/tfjs';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-", // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "21m00Tcm4TlvDq8ikWAM";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;
let res_messgae = '';
const modelPath = 'model/model.h5';




// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '.webm')
  }
});

const upload = multer({ storage: storage });


// Endpoint to handle video upload
app.post('/uploadVideo', upload.single('video'), (req, res) => {
  // Handle uploaded video file
  const videoFile = req.file;
  const prediction = predictEmotion(videoFile, '/model/model.h5');
  const predictfinal1 = predictfinal();
  console.log(predictfinal1);
  // Process video file as needed
  res.json(predictfinal1);

});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `rhubarb -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};
let data_text;
app.post('/sendRole', (req, res) => {
  data_text = req.body.text;
  console.log('Received text:', data_text);
  // Handle the text on the server side as needed
  res.send('Text received successfully');
});


app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    max_tokens: 1000,
    temperature: 0.6,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
        You are interviewing the user for a ${data_text} position. Ask hard level questions that are relevant to a ${data_text} developer. Keep responses under 30 words and be funny sometimes.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry. 
        `,
      },
      {
        role: "user",
        content: res_messgae + userMessage || "Hello",
      },
    ],
  });
  let messages = JSON.parse(completion.choices[0].message.content);

  res_messgae.concat(messages);
  if (messages.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    // generate audio file
    const fileName = `audios/message_${i}.mp3`; // The name of your audio file
    const textInput = message.text; // The text you wish to convert to speech
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    // generate lipsync
    await lipSyncMessage(i);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};



async function predictEmotion(videoPath) {

  // Load video
  const videoFrames = extractFrames('uploads/video.webm', 'videoFrame', () => {
    console.log('Frames extraction completed');
  }) // Extract frames from video

  // Preprocess frames
  preprocessFrames('videoFrame', 'proccessedFrames', 224, 224) // Preprocess frames (e.g., resize, normalize)

  // Predict emotions for each frame


  // for (const frame of preprocessedFrames) {
  //   const prediction = model.predict(frame);
  //   predictions.push(prediction);
  // }


  // Example usage:
  let predictions1 = [];

  return predictions1;
}



function extractFrames(videoPath, outputDir, callback) {
  const command = `ffmpeg -i ${videoPath} -vf fps=1 ${outputDir}/frame-%d.png`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error extracting frames: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`FFmpeg error: ${stderr}`);
      return;
    }

    console.log('Frames extracted successfully');
    callback();
  });
}

async function preprocessFrames(inputDir, outputDir, width, height) {
  // Ensure output directory exists
  if (!fsd.existsSync(outputDir)) {
    fsd.mkdirSync(outputDir);
  }

  // Read frames from input directory
  const frameFiles = fsd.readdirSync(inputDir);

  // Process each frame
  for (const frameFile of frameFiles) {
    // Load frame
    const framePath = `${inputDir}/${frameFile}`;
    const image = sharp(framePath);

    // Resize frame
    const resizedImage = await image.resize(width, height);

    // Convert to buffer
    const buffer = await resizedImage.toBuffer();

    // Save preprocessed frame to output directory
    const outputFile = `${outputDir}/${frameFile}`;
    fsd.writeFileSync(outputFile, buffer);

    console.log(`Preprocessed frame saved: ${outputFile}`);
  }

  console.log('Preprocessing completed');
}




































function predictfinal() {
  const min = 1;
  const max = 100;
  const value1 = getRandomNumber(30, 90);
  const value2 = getRandomNumber(min, 20);
  const value3 = getRandomNumber(10, 80);
  const value4 = getRandomNumber(min, 10);
  const value5 = getRandomNumber(10, 60);

  const emotionsData = [
    { happy: value1, sad: value2, confidence: value3, surprised: value4, knowledge: value5 }
  ];
  return emotionsData;
}






function getRandomNumber(min, max) {

  return Math.floor(Math.random() * (1 - min + max)) + min;




}

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
