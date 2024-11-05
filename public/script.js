// public/script.js

let playlistLink = '';
let playlistName = '';
let tracks = [];
let currentTrackIndex = 0;
let maxRounds = 0;
let totalRounds = 0;
let correctTitleGuesses = 0;
let correctArtistGuesses = 0;

// Variables to store Chart.js instances
let titleChart = null;
let artistChart = null;

document.getElementById('playlist-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  playlistLink = document.getElementById('playlist-link').value;

  try {
    await initializeGame();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'An unexpected error occurred.');
  }
});

async function initializeGame() {
  const response = await fetch('/api/playlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playlistLink }),
  });
  const data = await response.json();

  if (response.ok) {
    // Extract playlist name and tracks
    playlistName = data.playlistName;
    tracks = data.tracks;

    console.log(`Total tracks fetched: ${tracks.length}`);

    // Calculate max rounds
    const halfPlaylistLength = Math.ceil(tracks.length / 2);
    maxRounds = Math.min(halfPlaylistLength, 10);

    // Shuffle the tracks array
    shuffleArray(tracks);

    // Log first 10 tracks after shuffle for verification
    console.log('First 10 tracks after shuffle:');
    console.log(tracks.slice(0, 10));

    // Limit tracks to maxRounds
    tracks = tracks.slice(0, maxRounds);

    // Log selected tracks
    console.log('Selected tracks for the game:');
    console.log(tracks);

    // Reset game variables
    currentTrackIndex = 0;
    totalRounds = 0;
    correctTitleGuesses = 0;
    correctArtistGuesses = 0;

    // Update score display
    updateScoreDisplay();

    // Show the game area
    document.getElementById('playlist-form-container').style.display = 'none';
    document.getElementById('guidelines').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    document.getElementById('result').textContent = '';
    document.getElementById('result').className = '';
    document.getElementById('guess-title').value = '';
    document.getElementById('guess-artist').value = '';
    document.getElementById('next-button').style.display = 'none';
    document.getElementById('skip-button').style.display = 'inline-block';

    // Hide cover art
    document.getElementById('cover-art').style.display = 'none';
    document.getElementById('cover-art').src = '';

    // Play the first track
    playCurrentTrack();
  } else {
    alert(data.error);
  }
}

function playCurrentTrack() {
  const track = tracks[currentTrackIndex];

  // Stop and reset the audio player
  const audioPlayer = document.getElementById('audio-player');
  audioPlayer.pause();
  audioPlayer.currentTime = 0;

  // Set up the new audio source
  audioPlayer.src = track.preview_url;
  audioPlayer.play();

  // Reset UI elements
  document.getElementById('result').textContent = '';
  document.getElementById('result').className = '';
  document.getElementById('guess-title').value = '';
  document.getElementById('guess-artist').value = '';

  // Re-enable the input fields and submit button
  document.getElementById('guess-title').disabled = false;
  document.getElementById('guess-artist').disabled = false;
  document.querySelector('#guess-form button[type="submit"]').disabled = false;

  // Show the Skip button and hide the Next button
  document.getElementById('skip-button').style.display = 'inline-block';
  document.getElementById('next-button').style.display = 'none';

  // Hide cover art
  document.getElementById('cover-art').style.display = 'none';
  document.getElementById('cover-art').src = '';
}

document.getElementById('guess-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const track = tracks[currentTrackIndex];
  const correctTitle = stripParentheses(track.name.toLowerCase());
  const correctArtists = track.artists.map((artist) => artist.toLowerCase());

  const userTitleGuess = stripParentheses(document.getElementById('guess-title').value.toLowerCase().trim());
  const userArtistGuess = document.getElementById('guess-artist').value.toLowerCase().trim();

  let resultMessages = [];

  // Check song title
  let titleGuessed = false;
  if (userTitleGuess && userTitleGuess === correctTitle) {
    titleGuessed = true;
    correctTitleGuesses++;
    resultMessages.push('Song title correct!');
  } else if (userTitleGuess) {
    resultMessages.push(`Song title incorrect. The correct title was "${track.name}"`);
  } else {
    resultMessages.push(`No song title guess. The correct title was "${track.name}"`);
  }

  // Check artist name(s)
  let artistGuessed = false;
  if (userArtistGuess) {
    const userArtists = userArtistGuess.split(',').map((artist) => artist.trim().toLowerCase());
    const matchedArtists = userArtists.filter((artist) => correctArtists.includes(artist));

    if (matchedArtists.length > 0) {
      artistGuessed = true;
      correctArtistGuesses++;
      resultMessages.push('Artist name correct!');
    } else {
      resultMessages.push(`Artist name incorrect. The correct artist(s): "${track.artists.join(', ')}"`);
    }
  } else {
    resultMessages.push(`No artist guess. The correct artist(s): "${track.artists.join(', ')}"`);
  }

  document.getElementById('result').innerHTML = resultMessages.join('<br>');
  totalRounds++;

  // Update score display
  updateScoreDisplay();

  // Disable the input fields and submit button
  document.getElementById('guess-title').disabled = true;
  document.getElementById('guess-artist').disabled = true;
  document.querySelector('#guess-form button[type="submit"]').disabled = true;

  // Hide the Skip button and show the Next button
  document.getElementById('skip-button').style.display = 'none';
  document.getElementById('next-button').style.display = 'inline-block';

  // Display cover art
  if (track.cover_art_url) {
    document.getElementById('cover-art').src = track.cover_art_url;
    document.getElementById('cover-art').style.display = 'block';
  }
});

document.getElementById('skip-button').addEventListener('click', () => {
  const track = tracks[currentTrackIndex];
  document.getElementById('result').innerHTML = `Skipped.<br>The correct title was "${track.name}"<br>The artist(s): "${track.artists.join(', ')}"`;

  totalRounds++;

  // Update score display
  updateScoreDisplay();

  // Disable the input fields and submit button
  document.getElementById('guess-title').disabled = true;
  document.getElementById('guess-artist').disabled = true;
  document.querySelector('#guess-form button[type="submit"]').disabled = true;

  // Hide the Skip button and show the Next button
  document.getElementById('skip-button').style.display = 'none';
  document.getElementById('next-button').style.display = 'inline-block';

  // Display cover art
  if (track.cover_art_url) {
    document.getElementById('cover-art').src = track.cover_art_url;
    document.getElementById('cover-art').style.display = 'block';
  }
});

document.getElementById('next-button').addEventListener('click', () => {
  if (totalRounds >= maxRounds) {
    endGame();
  } else {
    currentTrackIndex++;
    playCurrentTrack();
  }
});

function endGame() {
  // Stop the audio player
  const audioPlayer = document.getElementById('audio-player');
  audioPlayer.pause();
  audioPlayer.currentTime = 0;

  // Hide game area and display result page
  document.getElementById('game-area').style.display = 'none';
  document.getElementById('result-page').style.display = 'block';

  // Display playlist name
  document.getElementById('playlist-name-display').textContent = `Playlist: ${playlistName}`;

  // Calculate percentages
  const titleGuessPercentage = ((correctTitleGuesses / maxRounds) * 100).toFixed(1);
  const artistGuessPercentage = ((correctArtistGuesses / maxRounds) * 100).toFixed(1);

  // Update the text for correct guesses
  document.getElementById('title-correct-guess').textContent =
    `You guessed ${correctTitleGuesses} out of ${maxRounds} correctly.`;

  document.getElementById('artist-correct-guess').textContent =
    `You guessed ${correctArtistGuesses} out of ${maxRounds} correctly.`;

  // Check if charts already exist
  if (titleChart) {
    // Update existing chart data
    titleChart.data.datasets[0].data = [correctTitleGuesses, maxRounds - correctTitleGuesses];
    titleChart.options.plugins.title.text = `${titleGuessPercentage}%`;
    titleChart.update();
  } else {
    // Create new chart for song titles
    const titleCtx = document.getElementById('title-chart').getContext('2d');
    titleChart = new Chart(titleCtx, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect'],
        datasets: [{
          data: [correctTitleGuesses, maxRounds - correctTitleGuesses],
          backgroundColor: ['#1db954', '#e9ecef'],
        }]
      },
      options: {
        cutout: '70%',
        plugins: {
          tooltip: {
            enabled: false
          },
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `${titleGuessPercentage}%`,
            position: 'center',
            color: '#1db954',
            font: {
              size: 48
            }
          }
        }
      }
    });
  }

  if (artistChart) {
    // Update existing chart data
    artistChart.data.datasets[0].data = [correctArtistGuesses, maxRounds - correctArtistGuesses];
    artistChart.options.plugins.title.text = `${artistGuessPercentage}%`;
    artistChart.update();
  } else {
    // Create new chart for artist names
    const artistCtx = document.getElementById('artist-chart').getContext('2d');
    artistChart = new Chart(artistCtx, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect'],
        datasets: [{
          data: [correctArtistGuesses, maxRounds - correctArtistGuesses],
          backgroundColor: ['#1db954', '#e9ecef'],
        }]
      },
      options: {
        cutout: '70%',
        plugins: {
          tooltip: {
            enabled: false
          },
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `${artistGuessPercentage}%`,
            position: 'center',
            color: '#1db954',
            font: {
              size: 48
            }
          }
        }
      }
    });
  }
}

// Share on X functionality
document.getElementById('share-button').addEventListener('click', () => {
  shareResultsOnX();
});

function shareResultsOnX() {
  // Calculate percentages
  const titleGuessPercentage = ((correctTitleGuesses / maxRounds) * 100).toFixed(1);
  const artistGuessPercentage = ((correctArtistGuesses / maxRounds) * 100).toFixed(1);

  // Create the text for sharing
  const shareText = `I just played Know Your Spotify!
  
I guessed ${correctTitleGuesses}/${maxRounds} song titles (${titleGuessPercentage}%) and ${correctArtistGuesses}/${maxRounds} artist names (${artistGuessPercentage}%) from the "${playlistName}" playlist.

Try it out here: https://spotify-guessing-game-1d365a8c48b8.herokuapp.com/`; // REPLACE WITH ACTUAL DOMAIN LATER

  // Encode the text for URL
  const encodedText = encodeURIComponent(shareText);

  // Create the share URL
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;

  // Open the share URL in a new window
  window.open(shareUrl, '_blank');
}

function shuffleArray(array) {
  // Fisher-Yates Shuffle Algorithm
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function updateScoreDisplay() {
  const scoreDisplay = document.getElementById('score-display');
  scoreDisplay.innerHTML = `
    <p>Progress: ${totalRounds}/${maxRounds}</p>
    <p>Correct song titles: ${correctTitleGuesses}</p>
    <p>Correct artist names: ${correctArtistGuesses}</p>
  `;
}

function stripParentheses(text) {
  return text.replace(/\s*\(.*?\)\s*/g, '').trim();
}

// Restart the game
document.getElementById('restart-button').addEventListener('click', () => {
  // Reset the game state
  resetGame();

  // Start a new game
  document.getElementById('playlist-form-container').style.display = 'block';
  document.getElementById('guidelines').style.display = 'block';
});

// Event listener for the Return to Main Menu button during the game
document.getElementById('return-to-menu-button').addEventListener('click', () => {
  resetGame();
});

// Event listener for the Return to Main Menu button on the result page
document.getElementById('return-to-menu-button-result').addEventListener('click', () => {
  resetGame();
});

function resetGame() {
  // Stop the audio
  const audioPlayer = document.getElementById('audio-player');
  audioPlayer.pause();
  audioPlayer.currentTime = 0;

  // Hide game area and result page
  document.getElementById('game-area').style.display = 'none';
  document.getElementById('result-page').style.display = 'none';

  // Reset the game state variables
  playlistLink = '';
  playlistName = '';
  tracks = [];
  currentTrackIndex = 0;
  maxRounds = 0;
  totalRounds = 0;
  correctTitleGuesses = 0;
  correctArtistGuesses = 0;

  // Reset form fields
  document.getElementById('playlist-link').value = '';
  document.getElementById('guess-title').value = '';
  document.getElementById('guess-artist').value = '';

  // Show the playlist submission form and guidelines
  document.getElementById('playlist-form-container').style.display = 'block';
  document.getElementById('guidelines').style.display = 'block';

  // Destroy existing charts
  if (titleChart) {
    titleChart.destroy();
    titleChart = null;
  }
  if (artistChart) {
    artistChart.destroy();
    artistChart = null;
  }
}
