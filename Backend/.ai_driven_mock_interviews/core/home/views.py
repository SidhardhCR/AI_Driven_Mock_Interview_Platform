from django.conf import settings
import os
from .models import Post
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse, request
import requests
from django.core.files.storage import default_storage
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
from dotenv import load_dotenv
import openai
import os
import json
import pyttsx3
from elevenlabs import Voice
from rest_framework.viewsets import ModelViewSet
from .serializer import PostSerializer


class PostViewSet(ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer


# Create your views here.
load_dotenv()

openai.api_key = os.getenv("OPEN_AI_KEY")
openai.organization = os.getenv("OPEN_AI_ORG")
elevenlabs_api_key = os.getenv("ELEVENLABS_API")


@csrf_exempt
def talk(request):
    print("hi")
    if request.method == 'POST':
        user_message = request.POST.get("message", "")
        print(user_message)

    # user_message= transcribe_audio(file)
    # "How are you today?"
    #user_message = Post.objects.all()
   # serializer = PostSerializer(user_message, many=True)
   # serialized_data = serializer.data
    #print(serialized_data)
   # texts = [post['text'] for post in serialized_data]
   # print(texts)
    #text_string = texts[0]
    #print(text_string)
   # chat_response = get_chat_response(text_string)
    # audio_output = text_to_speech(chat_response)
    # play_audio(chat_response)

    return JsonResponse({'message': 'File uploaded successfully'})


# Functions
# Transcribe Audio


def transcribe_audio(file):
    # Generate a unique filename
    file_path = os.path.join(settings.MEDIA_ROOT, file.name)

    # Open a file in write-binary mode and write the contents of the uploaded file to it
    with open(file_path, 'wb') as destination:
        for chunk in file.chunks():
            destination.write(chunk)

    # Open the saved file and pass its path to the transcribe function
    with open(file_path, 'rb') as audio_file:
        transcript = openai.audio.transcriptions.create(
            model="whisper-1", file=audio_file)
        transcribed_text = transcript.text
        print(transcribed_text)

    return transcribed_text


def get_chat_response(user_message):
    messages = load_messages()
    messages.append({"role": "user", "content": user_message})
    gpt_response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    print(gpt_response)
    parsed_gpt_response = gpt_response.choices[0].message.content

    save_message(user_message, parsed_gpt_response)
    return parsed_gpt_response


def load_messages():
    messages = []
    file = os.path.join(settings.BASE_DIR, 'database.json')
    empty = os.stat(file).st_size == 0

    if not empty:
        with open(file)as db_file:
            data = json.load(db_file)
            for item in data:
                messages.append(item)
    else:
        messages.append({"role": "system", "content": "You are interviewing the user for a front-end React developer position. Ask short questions that are relevant to a junior level developer. Your name is Greg. The user is Travis. Keep responses under 30 words and be funny sometimes."})
    return messages


def save_message(user_message, gpt_response):
    file = os.path.join(settings.BASE_DIR, 'database.json')

    messages = load_messages()
    messages.append({"role": "user", "content": user_message})
    messages.append({"role": "assistant", "content": gpt_response})
    with open(file, 'w') as f:
        json.dump(messages, f)


def text_to_speech(text):

    voice_id = "JBFqnCBsd6RMkjVDRZzb"
    CHUNK_SIZE = 1024
    body = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0,
            "similarity_boost": 0,
            "style": 0.5,
            "use_speaker_boost": True
        }
    }

    headers = {
        "Content-Type": "application/json",
        "accept": "audio/mpeg",
        "xi-api-key": elevenlabs_api_key
    }
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

    try:
        response = requests.post(url, json=body, headers=headers)

        if response.status_code == 200:

            with open('output.mp3', 'wb') as f:
                for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        f.write(chunk)

            return response.content
        else:
            print("Somthing Went wrong")
    except Exception as e:
        print(e)


engine = pyttsx3.init()
voices = engine.getProperty('voices')
for i, voice in enumerate(voices):
    print("Voice ID:", i)
    print(" - Name:", voice.name)
    print(" - Languages:", voice.languages)
    print(" - Gender:", voice.gender)
    print(" - Age:", voice.age)
    print("\n")


def play_audio(text):
    engine = pyttsx3.init()

    voices = engine.getProperty('voices')
    engine.setProperty('voice', voices[0].id)
    engine.say(text)
    engine.runAndWait()
