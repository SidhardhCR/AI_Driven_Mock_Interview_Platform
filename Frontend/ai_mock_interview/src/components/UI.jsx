import { useRef } from "react";
import { useChat } from "../hooks/useChat";
import { useState } from "react";
import Webcam from 'react-webcam';
import RecordRTC from 'recordrtc';


export const UI = ({ hidden, ...props }) => {
  
  const { chat, loading, cameraZoomed, setCameraZoomed, message } = useChat();
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState('');
  const [inputValue, setInputValue] = useState('');
  const startListening = () => {
    const recognition = new window.webkitSpeechRecognition();
    
    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      const confidence = text.length;
      setConfidence(confidence);
      setTranscript(text);
      
    };
    
    recognition.start();
    console.log(transcript);
  };

  

  const sendMessage = () => {
    const text = transcript //input.current.value;
    if (!loading && !message) {
      chat(text);
      // input.current.value = "";
    }
    setTranscript("");
  };
  if (hidden) {
    return null;
  }

  const webcamRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const[finalResult,setFinalResult]=useState(null);

  const startRecording = () => {
    setRecording(true);
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        const newRecorder = RecordRTC(stream, {
          type: 'video'
        });
        newRecorder.startRecording();
        setRecorder(newRecorder);
      })
      .catch((err) => console.error('Error accessing webcam:', err));
  };

  const stopRecording = () => {
    
    setRecording(false);
    if (recorder) {
      recorder.stopRecording(() => {
        const blob = recorder.getBlob();
        setRecordedBlob(blob);
       
        recorder.reset();
      });
    }
  };

  const downloadVideo = () => {
    if (recordedBlob) {
      const url = window.URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = 'recorded-video.webm';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const sendVideoToServer = (blob) => {
    const formData = new FormData();
    formData.append('video', blob);

    fetch('http://localhost:3000/uploadvideo', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json()).then(data=>setFinalResult(data)
  ).catch(error => {
      console.error('Error fetching data:', error)
    });
  };
 
  const handleButtonClick = () => {
    stopRecording();
    sendVideoToServer(recordedBlob)
  };
const text=inputValue;
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/sendRole', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify( {text} )
      });
      if (response.ok) {
        console.log('Text sent successfully');
      } else {
        console.error('Failed to send text:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending text:', error);
    }
  };
  const handleChange = (e) => {
    setInputValue(e.target.value);
  };
  


 

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg">
          <h1 className="font-black text-xl">AI Mock Interview Platform</h1>
          <p>I will always here to help you</p>
        </div>
        <div className="w-full flex flex-col items-end justify-center gap-4">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="pointer-events-auto bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-md"
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              const body = document.querySelector("body");
              if (body.classList.contains("greenScreen")) {
                body.classList.remove("greenScreen");
              } else {
                body.classList.add("greenScreen");
              }
            }}
            className="pointer-events-auto bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
        </div>
        <div className="pb-8 w-28">
        <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
              />
        </div>
        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full ">
        <input
            className="w-34 placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
            placeholder="Type your role..."
            type="text"
            value={inputValue}
            onChange={handleChange}
            // onKeyDown={(e) => {
            //   if (e.key === "Enter") {
            //     sendMessage();
            //   }
            // }}
          />
           <button
            disabled={loading || message}
            onClick={handleSubmit}
            className={`bg-blue-500 hover:bg-blue-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
              loading || message ? "cursor-not-allowed opacity-30" : ""
            }`}
          >
            Send
          </button>
          </div>

        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
        
        
         
          <button
            disabled={loading || message}
            onClick={sendMessage}
            className={`bg-blue-500 hover:bg-blue-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
              loading || message ? "cursor-not-allowed opacity-30" : ""
            }`}
          >
            Send
          </button>
          <button
            disabled={loading || message}
            onClick={startListening}
            className={`bg-blue-500 hover:bg-blue-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
              loading || message ? "cursor-not-allowed opacity-30" : ""
            }`}
          >
            Listen
          </button>
          <p className="text-white p-5">User Text: {transcript}</p>
          <p className="text-white">Confidence: {confidence}</p>
          
                {recording ? (
              <button className="text-white" onClick={handleButtonClick}>Stop Recording</button>
            ) : (
              <button className="text-white" onClick={startRecording}>Start Recording</button>
            )}

                 <p className="text-white">Final Result: {JSON.stringify(finalResult)}</p>
            
              
                  
                  {/* <button onClick={downloadVideo}>Download Video</button> */}
                
      
        </div>
      </div>
    </>
    
  );
  
};

