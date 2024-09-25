import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { faYoutube, faGithub } from '@fortawesome/free-brands-svg-icons';

// Add these imports at the top of your file

// Set the app element for accessibility
Modal.setAppElement('#root');

function App() {
  const [inputs, setInputs] = useState({
    //openaiKey: '',
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
    further_readings: '',
    img_link: ''
  });
  const [submitStatus, setSubmitStatus] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch default data when component mounts
    fetchDefaultData();
  }, []);

  const fetchDefaultData = async () => {
    try {
      const response = await axios.get('/default-data');
      setGraphData(response.data);
      console.log("graphData:", response.data);
    } catch (error) {
      console.error('Error fetching default data:', error);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const uploadImage = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post('/upload-image', formData, {
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      let imageUrl = uploadedImageUrl;
      if (selectedFile) {
        imageUrl = await uploadImage();
      }

      const response = await axios.post('/analyze', {
        ...inputs,
        imageUrl
      });
      setGraphData(response.data.graphData);
      setSubmitStatus('success');
      console.log("graphData:", response.data.graphData);
    } catch (error) {
      setSubmitStatus('error');
      console.error('Error during analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header>
        <div>
          <h1>Vizard: Improving Visual Data Literacy with Large Language Models</h1>
          <div className="author-emails">
            <p className="author-email"><a href="https://rubabzs.github.io/">Rubab Zahra Sarfraz</a></p>
            <p className="author-email"><a href="https://samarh.github.io/">Samar Haider</a></p>
          </div>
        </div>
        <div className="bigvis-link"><a href="https://bigvis.imsi.athenarc.gr/bigvis2024/cfp.html">BigVis @ VLDB 2024</a></div>
        <div className="header-buttons">
          <button className="header-button" onClick={() => window.open('https://rubabzs.github.io/files/vizard.pdf', '_blank')}>
            <FontAwesomeIcon icon={faFilePdf} /> Paper
          </button>
          <button className="header-button" onClick={() => window.open('https://www.youtube.com/watch?v=GvphIVJlKgM', '_blank')}>
            <FontAwesomeIcon icon={faYoutube} /> Talk
          </button>
          <button className="header-button" onClick={() => window.open('https://github.com/rubabzs/vizard', '_blank')}>
            <FontAwesomeIcon icon={faGithub} /> Code
          </button>
        </div>
        <button className="instructions-button" onClick={() => setModalIsOpen(true)}>Read Instructions</button>
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
          <p>Vizard is a demo based on a research project aimed at helping people understand data visualizations better, regardless of their language or background. 
            Here's how you can interact with Vizard and use it to get insights from your data visualizations.</p>
          <ol>
            <li>Choose your preferred language for the analysis.</li>
            <li>Specify your role (e.g., Operations Manager, Business Analyst, etc.).</li>
            <li>Enter the domain of your data (e.g., Finance, Healthcare, etc.).</li>
            <li>Select the Data Visualization Literacy (DVL) level.</li>
            <li>Upload an image of the graph you want to analyze.</li>
            <li>Click 'Analyze' to get your personalized analysis.</li>
          </ol>
          <p>The analysis will appear in the sections below after submission. Please note that the response cound take 5-10 seconds to load. The DVL levels are as follows:</p>
          <ol>
            <li><b>DVL Level 1</b>: User does not know anything about the graphs and charts.</li>
            <li><b>DVL Level 2</b>: User knows about different kinds of charts but finds it difficult building relationships between variables given in the chart.</li>
            <li><b>DVL Level 3</b>: User can build relationships between 2 variables but finds it difficult to build relationship between more variables.</li>
            <li><b>DVL Level 4</b>: User can build relationships between more than 2 variables but finds it difficult to apply their domain knowledge on the graph and draw insights.</li>
            <li><b>DVL Level 5</b>: User can apply domain knowledge and derive insights and actionables from the graphs.</li>
          </ol>
          <div className="modal-button-container">
            <button onClick={() => setModalIsOpen(false)}>Close</button>
          </div>
        </Modal>
        <div className="content">
          <div className="top-row">
            <div className="input-section">
              <h3>Input Data</h3>
              <form onSubmit={handleSubmit} className="input-form">
                {/* <div className="form-group">
                  <label htmlFor="openaiKey">OpenAI Key:</label>
                  <input
                    type="password"
                    id="openaiKey"
                    name="openaiKey"
                    placeholder="Enter your OpenAI key"
                    value={inputs.openaiKey}
                    onChange={handleChange}
                  />
                </div> */}
                <div className="form-group">
                  <label htmlFor="language">Language:</label>
                  <input
                    type="text"
                    id="language"
                    name="language"
                    placeholder="English, Urdu, Spanish, Chinese, etc."
                    value={inputs.language}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="userRole">Role:</label>
                  <input
                    type="text"
                    id="userRole"
                    name="userRole"
                    placeholder="Policy Maker, Business User, etc."
                    value={inputs.userRole}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="domain">Domain:</label>
                  <input
                    type="text"
                    id="domain"
                    name="domain"
                    placeholder="Financial Services, Education, etc."
                    value={inputs.domain}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dvlLevel">Data Literacy:</label>
                  <select
                    id="dvlLevel"
                    name="dvlLevel"
                    value={inputs.dvlLevel}
                    onChange={handleChange}
                  >
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                    <option value="5">Level 5</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="graphImage">Upload Graph:</label>
                  <input
                    type="file"
                    id="graphImage"
                    name="graphImage"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
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
              <img src={uploadedImageUrl || graphData.img_link} alt="Analyzed Graph" className="graph-image" />
            </div>
          </div>
          
          {isLoading ? (
            <div className="loader"></div>
          ) : (
            <>
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
              {graphData.insights && (
                <ul>
                  {(Array.isArray(graphData.insights) 
                    ? graphData.insights 
                    : graphData.insights.split('.').filter(Boolean).map(insight => insight.trim())
                  ).map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="data-section">
              <h3>Recommendations</h3>
              {graphData.recommendations && (
                <ul>
                  {(Array.isArray(graphData.recommendations)
                    ? graphData.recommendations
                    : graphData.recommendations.split('.').filter(Boolean).map(rec => rec.trim())
                  ).map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="data-section">
              <h3>Further Readings</h3>
              {graphData.further_readings && (
                <ul>
                  {(Array.isArray(graphData.further_readings)
                    ? graphData.further_readings
                    : graphData.further_readings.split('.').filter(Boolean).map(link => link.trim())
                  ).map((link, index) => (
                    <li key={index}>{link}</li>
                  ))}
                </ul>
              )}
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;