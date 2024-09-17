import React, { useState } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import './App.css';
import microloan from './images/microloan.png';

// Set the app element for accessibility
Modal.setAppElement('#root');

function App() {
  const [inputs, setInputs] = useState({
    openaiKey: '',
    language: '',
    userRole: '',
    domain: '',
    dvlLevel: '1'
  });
  const [graphData, setGraphData] = useState({
    graph_description: '',
    data_description: '',
    insights: '',
    recommendations: '',
    further_links: '',
    img_link: ''
  });
  const [submitStatus, setSubmitStatus] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const uploadImage = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post('http://localhost:8000/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadedImageUrl(response.data.imageUrl);
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = uploadedImageUrl;
      if (selectedFile) {
        imageUrl = await uploadImage();
      }

      const response = await axios.post('http://localhost:8000/analyze', {
        ...inputs,
        imageUrl
      });
      setGraphData(response.data.graphData);
      setSubmitStatus('success');
      console.log("graphData:", response.data.graphData);
    } catch (error) {
      setSubmitStatus('error');
      console.error('Error during analysis:', error);
    }
  };

  return (
    <div className="App">
      <header>
        <div>
          <h1>Vizard: Data Visualizations for Everyone</h1>
          <button className="instructions-button" onClick={() => setModalIsOpen(true)}>Read Instructions</button>
        </div>
      </header>
      <main className="main-content">
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={() => setModalIsOpen(false)}
          contentLabel="Instructions"
          className="modal"
          overlayClassName="overlay"
        >
          <h2>Instructions</h2>
          <p>Welcome to Vizard! Here's how to use this tool:</p>
          <ol>
            <li>Enter your OpenAI key in the input field.</li>
            <li>Choose your preferred language for the analysis.</li>
            <li>Specify your role (e.g., Data Analyst, Manager, etc.).</li>
            <li>Enter the domain of your data (e.g., Finance, Healthcare, etc.).</li>
            <li>Select the Data Visualization Literacy (DVL) level.</li>
            <li>Upload an image of the graph you want to analyze.</li>
            <li>Click 'Submit' to get your personalized analysis.</li>
          </ol>
          <p>The analysis will appear in the sections below after submission.</p>
          <button onClick={() => setModalIsOpen(false)}>Close</button>
        </Modal>
        <div className="content">
          <div className="top-row">
            <div className="input-section">
              <h3>Input Data</h3>
              <form onSubmit={handleSubmit}>
                <input
                  type="password"
                  name="openaiKey"
                  placeholder="Enter your OpenAI key"
                  value={inputs.openaiKey}
                  onChange={handleChange}
                />
                <select
                  type="text"
                  name="language"
                  placeholder="Enter preferred language"
                  value={inputs.language}
                  onChange={handleChange}
                >
                  <option value="English">English</option>
                  <option value="Urdu">Urdu</option>
                  <option value="Roman Urdu">Roman Urdu</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="Polish">Polish</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Roman Hindi">Roman Hindi</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Russian">Russian</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Chinese">Chinese</option>
                </select>
                <select
                  type="text"
                  name="userRole"
                  placeholder="Enter your role"
                  value={inputs.userRole}
                  onChange={handleChange}
                >
                  <option value="Policy Maker">Policy Maker</option>
                  <option value="Business Analyst">Business Analyst</option>
                  <option value="Operations Manager">Operations Manager</option>
                  <option value="Marketing Associate">Marketing Associate</option>
                  <option value="Sales Representative">Sales Representative</option>
                </select>
                <input
                  type="text"
                  name="domain"
                  placeholder="Enter domain"
                  value={inputs.domain}
                  onChange={handleChange}
                />
                <select
                  name="dvlLevel"
                  value={inputs.dvlLevel}
                  onChange={handleChange}
                >
                  <option value="1">DVL Level 1</option>
                  <option value="2">DVL Level 2</option>
                  <option value="3">DVL Level 3</option>
                  <option value="4">DVL Level 4</option>
                  <option value="5">DVL Level 5</option>
                </select>
                <input
                  type="file"
                  name="graphImage"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <button type="submit">Analyze</button>
              </form>
              {submitStatus && (
                <div className={`status-message status-${submitStatus}`}>
                  {submitStatus === 'success' 
                    ? 'Analysis completed successfully!' 
                    : 'Error during analysis. Please try again.'}
                </div>
              )}
            </div>
            <div className="graph-container">
              <h3>Graph</h3>
              <img src={uploadedImageUrl || graphData.img_link || microloan} alt="Analyzed Graph" className="graph-image" />
            </div>
          </div>
          <div className="data-section">
            <h3>Graph Description</h3>
            <p>{graphData.graph_description}</p>
          </div>
          <div className="data-section">
            <h3>Data Description</h3>
            <p>{graphData.data_description}</p>
          </div>
          <div className="data-section">
            <h3>Insights</h3>
            <p>{graphData.insights}</p>
          </div>
          <div className="data-section">
            <h3>Recommendations</h3>
            <p>{graphData.recommendations}</p>
          </div>
          <div className="data-section">
            <h3>Further Links</h3>
            <p>{graphData.further_links}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;