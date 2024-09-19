from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from google.cloud import storage
import pandas as pd
import json
from uuid import uuid4
import shutil
import os


app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://34.46.190.78:8000"],  # React app's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="vizardapp/build")
# Mounts the `static` folder within the `build` folder to the `/static` route.
app.mount('/static', StaticFiles(directory="vizardapp/build/static"), 'static')
# Create a directory to store uploaded images
os.makedirs("uploaded_images", exist_ok=True)

# Mount the directory to serve images
app.mount("/images", StaticFiles(directory="uploaded_images"), name="images")

PUBLIC_URL = "http://34.46.190.78:8000"

storage_client = storage.Client()
bucket_name = "graphsvz"  # Replace with your actual bucket name
bucket = storage_client.bucket(bucket_name)

default_data = {
    "graph_description": "This section will detail the description of the type of graph after analysis according to your preferences selected above.",
    "data_description": "This section will cover the description of the data points, labels, axis, colors, legends, data points, error bars after analysis.",
    "insights": "This section will show the insights about the graph after analysis.",
    "recommendations": "Recommendations based on your data will be provided here that are tailored to your role and domain.",
    "further_readings": "Relevant links and resources will be listed here",
    "img_link": "https://storage.googleapis.com/graphsvz/bar_chart.jpg"  # You can provide a default image path
}


@app.get('/api/health')
async def health():
    return { 'status': 'healthy' }


@app.get("/default-data")
async def get_default_data():
    print(default_data)
    return JSONResponse(content=default_data)


@app.post("/upload-image")
async def upload_image(image: UploadFile = File(...)):
    # Generate a unique filename
    file_extension = os.path.splitext(image.filename)[1]
    unique_filename = f"{uuid4()}{file_extension}"

    # Create a new blob and upload the file's contents.
    blob = bucket.blob(unique_filename)
    blob.upload_from_file(image.file)

    # Make the blob publicly accessible
    blob.make_public()

    # Construct the public URL
    public_url = f"https://storage.googleapis.com/{bucket_name}/{unique_filename}"
    
    return {"imageUrl": public_url}


literacy_levels = {
    1: """The user does not know anything about the graphs and charts. The output should explain the fundamental concepts of the graph in question in easy to understand language.
          Name the type of graph, explain the components of the graph, how it is used and why it is used. The user cannot consume technical insights and recommendations. The user will really like to enhance their ability to remember this type of chart.
          Give the user limited insights and recommendations that can be drawn from the graph by applying domain knowledge in an intuitive way. Examples should be added as well according to their domain and role.""",
    2: """The user knows about different kinds of charts but finds it difficult building relationships between variables given in the chart. The output should be less on explaining the graph in question
          rather why it's used here and how to interpret the relationships between the variables. The user will really like to learn how to build relationships between different variables. The output should take into account domain and role.""",
    3: """The user can build relationships between 2 variables but finds it difficult to build relationship between more variables. The output so all the sections should be balanced with knowledge. The output should take into account domain and role""",
    4: """The user can build relationships between more than 2 variables but finds it difficult to apply their domain knowledge on the graph and draw insights so the focus should be on layering in the domain knowledge to the
    graph. The output should take into account domain and role""",
    5: """The user can apply domain knowledge and derive insights and actionables from the graphs. The output should include inter and intra domain informations, market trends,
     questions for user to think about in insights and recommendations section. The further links sections should have further readings as well. The output should take into account domain and role"""
}

content_prompt = """
Task: Your task is to generate helpful educational content around the graph image that is uploaded. The content should be tailored to the individual using them, provided to you as input. The output should be content around the graph broken down into multiple sections.

Instructions: Generate the graph content for the user who has following characteristics. The detail level of the ouput should be dictated by the user's ability.

1. Understands {language} as their preferred language,
2. Have role of {user_role} at their workplace, and the {domain} is the industry they work in.
3. {dl_level}

The output should have the following schema:

1. Key: "graph_description"
   Value: The description of the graph shown in the image in the form of a single paragraph.

2. Key: "data_description"
   Value: The description of the labels, axis, colors, legends, data points, error bars in the form of a single paragrah.

3. Key: "insights"
   Value: Bullet point wise insights that can be drawn from it given the {domain} as domain and {user_role} as role mentioned.

4- Key: "recommendations"
   Value: The actionables tailored to the their {user_role} as role and {domain} as a domain.

5- Key: "further_readings"
   Value: The further references to studies and topics relevant to the graphs, trends. Don't generate any hyperlinks, just give a comma-separated list of names and sources. 

Do not return anything except the list of JSON objects of key-value pairs as output. Format as python dictionary.
""".strip()


@app.get("/{rest_of_path:path}")
async def react_app(req: Request, rest_of_path: str):
    return templates.TemplateResponse('index.html', { 'request': req })
    

def ask_gpt(user_prompt, img_link):
    openai_key = os.environ['OPENAI_KEY']
    client = OpenAI(api_key=openai_key)

    print(img_link)
    response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": user_prompt
        },
        {
          "type": "image_url",
          "image_url": {
            "url": img_link,
          },
        },
      ],
    }
    ],
  max_tokens=4096,
  )

    print(response.choices[0].message.content)
    return response.choices[0].message.content


def clean_json(gpt_response):
  s = gpt_response.strip().strip('`').strip('python').strip()
  return json.loads(s)


@app.post("/analyze")
async def analyze(input_data: dict):
    print(input_data)
    img_link = "./images/violin.png"
    img_link = 'https://drive.google.com/uc?export=view&id=1QduyREgYLYeHcvU-pDlUEbXRtzK9E2Q2'
    img_link = input_data["imageUrl"]
    #openai_key = input_data["openaiKey"]
    language = input_data["language"]
    user_role = input_data["userRole"]
    domain = input_data["domain"]
    dl_level = int(input_data["dvlLevel"])

    r = ask_gpt(content_prompt.format(language=language, user_role=user_role, domain=domain, dl_level=literacy_levels[dl_level]), img_link)
    r = clean_json(r)

    print(r)
    return {"status": "success", "graphData": r}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

