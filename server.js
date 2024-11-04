// server.js
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
  
  const express = require('express');
  const axios = require('axios');
  const cors = require('cors');
  
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static('public'));
  
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  console.log('Client ID is set:', !!clientId);
  console.log('Client Secret is set:', !!clientSecret);

// Function to get Spotify access token
async function getAccessToken() {
    const authOptions = {
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        grant_type: 'client_credentials',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
          ).toString('base64'),
      },
    };
  
    try {
      const response = await axios(authOptions);
      return response.data.access_token;
    } catch (error) {
      console.error(
        'Error fetching access token:',
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  }
  
// Route to handle playlist link submission
app.post('/api/playlist', async (req, res) => {
  const { playlistLink } = req.body;

  // Extract playlist ID from the link
  const regex = /playlist\/([a-zA-Z0-9]+)/;
  const match = playlistLink.match(regex);
  if (!match) {
    return res.status(400).json({ error: 'Invalid playlist link' });
  }
  const playlistId = match[1];

  try {
    const accessToken = await getAccessToken();

    // Get playlist details
    const playlistResponse = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: 'name,tracks.items(track(name,preview_url,artists(name),album(images)))',
          market: 'US',
        },
      }
    );

    const playlistName = playlistResponse.data.name;
    const tracks = playlistResponse.data.tracks.items
      .map((item) => item.track)
      .filter((track) => track && track.preview_url); // Only include tracks with a preview URL

    if (tracks.length === 0) {
      return res.status(400).json({ error: 'No playable tracks found in this playlist' });
    }

    // Send playlist data to the client
    res.json({
      playlistName,
      tracks: tracks.map((track) => ({
        name: track.name,
        preview_url: track.preview_url,
        artists: track.artists.map((artist) => artist.name),
        cover_art_url: track.album.images[0]?.url || '', // Get the largest image
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the playlist' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
