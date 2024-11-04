// public/script.js

let playlistLink = '';
let playlistName = '';
let tracks = [];
let currentTrackIndex = 0;
let maxRounds = 0;
let totalRounds = 0;
let correctTitleGuesses = 0;
let correctArtistGuesses = 0;

document.getElementById('playlist-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  playlistLink = document.getElementById('playlist-link').value;

  try {
    await initializeGame();
  } catch (error) {
    console.error('Error:', error);
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

    // Calculate max rounds
    const halfPlaylistLength = Math.ceil(tracks.length / 2);
    maxRounds = Math.min(halfPlaylistLength, 10);

    // Shuffle the tracks array
    shuffleArray(tracks);

    // Limit tracks to maxRounds
    tracks = tracks.slice(0, maxRounds);

    // Reset game variables
    currentTrackIndex = 0;
    totalRounds = 0;
    correctTitleGuesses = 0;
    correctArtistGuesses = 0;

    // Update score display
    updateScoreDisplay();

    // Show the game area
    document.getElementById('playlist-form-container').style.display = 'none';
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
  document.getElementById('next-button').style.display = 'none';
  document.getElementById('skip-button').style.display = 'inline-block';

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

  // Show the Next button and hide the Skip button
  document.getElementById('next-button').style.display = 'inline-block';
  document.getElementById('skip-button').style.display = 'none';

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

  // Show the Next button and hide the Skip button
  document.getElementById('next-button').style.display = 'inline-block';
  document.getElementById('skip-button').style.display = 'none';

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
  // Hide game area and display result page
  document.getElementById('game-area').style.display = 'none';
  document.getElementById('result-page').style.display = 'block';

  // Calculate percentages
  const titleGuessPercentage = ((correctTitleGuesses / maxRounds) * 100).toFixed(1);
  const artistGuessPercentage = ((correctArtistGuesses / maxRounds) * 100).toFixed(1);

  // Display the result message
  document.getElementById('final-result').innerHTML = `
    <h2>Here are your results!</h2>
    <p>You correctly guessed ${correctTitleGuesses} out of ${maxRounds} song titles (${titleGuessPercentage}%) from the "${playlistName}" playlist.</p>
    <p>You correctly guessed ${correctArtistGuesses} out of ${maxRounds} artist names (${artistGuessPercentage}%) from the "${playlistName}" playlist.</p>
  `;
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
  document.getElementById('result-page').style.display = 'none';
  document.getElementById('playlist-form-container').style.display = 'block';
  playlistLink = '';
  playlistName = '';
  tracks = [];
  currentTrackIndex = 0;
  maxRounds = 0;
  totalRounds = 0;
  correctTitleGuesses = 0;
  correctArtistGuesses = 0;
});
