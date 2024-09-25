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
    allow_origins=["http://34.173.155.37:8000"],  # React app's address
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

PUBLIC_URL = "https://34.173.155.37"

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
    1: """The user does not know anything about data visualizations such as graphs and charts. The output should explain the fundamental concepts of the visualization in question in language that is easy to understand. Name the type of visualization, explain its components, and explain how and why it is used. The user cannot consume technical insights and recommendations. The user would really like to enhance their ability to remember this type of chart. Give the user some limited insights and recommendations that can be drawn from the visualization by applying their domain knowledge in an intuitive way. Examples should be added as well according to their domain and role.""",
    2: """The user knows about different kinds of visualizations but finds it difficult to build relationships between the variables given in them. The output should focus less on explaining the graph in question and more on why it's used here and how to interpret the relationships between the variables. The user would really like to learn how to build relationships between different variables. The output should take into account their domain and role.""",
    3: """The user can build relationships between two variables but finds it difficult to build relationship between more variables. The output of all the sections should be balanced with knowledge. The output should take into account the user's domain and role.""",
    4: """The user can build relationships between more than two variables but finds it difficult to apply their domain knowledge to the visualization. The output should be focused on incorporating domain knowledge into the graph. The output should take into account the user's domain and role.""",
    5: """The user can apply domain knowledge and derive insights and recommendations from the visualizations. The output should include inter- and intra-domain information, market trends, and questions for the user to think about in the insights and recommendations sections. The further readings section should be technically resourceful. The output should take into account the user's domain and role."""
}

content_prompt = """
Task: Your task is to understand and explain the graph image that is uploaded and generate helpful educational content around it. The content should be tailored to the individual using this system and the output should be content around the graph broken down into multiple sections in a Python dictionary. 

Instructions: Generate the graph content for the user who has the following characteristics. The detail level of the ouput should be dictated by the user's ability.

1. The user understands {language} as their preferred language,
2. The user has a role of {user_role} at their workplace, and the {domain} is the industry they work in.
3. {dl_level}

The output should have the following schema:

1. Key: "graph_description"
   Value: A string containing the description of the graph shown in the image in the form of a single paragraph.

2. Key: "data_description"
   Value: A string containing the description of the labels, axis, colors, legends, data points, error bars in the form of a single paragrah.

3. Key: "insights"
   Value: A string containing bullet points of insights that can be drawn from it given the {domain} as domain and {user_role} as the user's role. Use dot as a delimeter for separating bullets.

4. Key: "recommendations"
   Value: A string containing bullet points of the actionable information tailored to a user with arole of {user_role} in {domain} domain.  Use dot as a delimeter for separating bullets.


5. Key: "further_readings"
   Value: A string containing bullet points of further references to studies and topics relevant to the graphs and trends. Do not generate any hyperlinks, just give a list of useful search terms for further research. Use dot as a delimeter for separating bullets.


Do not return anything except the above key-value pairs as a Python dictionary.
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

