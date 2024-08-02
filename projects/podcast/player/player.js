const audio = document.getElementById('audio');
const playPauseButton = document.getElementById('play-pause');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const volumeSlider = document.getElementById('volume');
const progressSlider = document.getElementById('progress');
const muteUnmuteButton = document.getElementById('mute-unmute');
const volumeIcon = document.getElementById('volume-icon');
const muteIcon = document.getElementById('mute-icon');
const forwardButton = document.getElementById('forward');
const backwardButton = document.getElementById('backward');

// Fetch the audio file and set it to the audio element
fetch('https://nyt.simplecastaudio.com/3026b665-46df-4d18-98e9-d1ce16bbb1df/episodes/0f5e1f46-83e2-4b70-81d0-377a3249e490/audio/128/default.mp3/default.mp3_ywr3ahjkcgo_d321aa208a6892b7d51556c28d053301_61337881.mp3?aid=rss_feed&awCollectionId=3026b665-46df-4d18-98e9-d1ce16bbb1df&awEpisodeId=0f5e1f46-83e2-4b70-81d0-377a3249e490&feed=82FI35Px&hash_redirect=1&x-total-bytes=61337881&x-ais-classified=unclassified&listeningSessionID=0CD_382_214__31f9794e5845c6b72f7427732e623dcba0020d94')
    .then(response => response.blob())
    .then(blob => {
        const url = URL.createObjectURL(blob);
        audio.src = url;
    })
    .catch(error => console.error('Error fetching audio file:', error));


// Play/Pause button functionality
playPauseButton.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        audio.pause();
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
});

// Update volume based on slider
volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value;
    if (audio.volume === 0) {
        volumeIcon.style.display = 'none';
        muteIcon.style.display = 'block';
    } else {
        volumeIcon.style.display = 'block';
        muteIcon.style.display = 'none';
    }
});

// Mute/Unmute functionality
muteUnmuteButton.addEventListener('click', () => {
    if (audio.muted) {
        audio.muted = false;
        volumeIcon.style.display = 'block';
        muteIcon.style.display = 'none';
    } else {
        audio.muted = true;
        volumeIcon.style.display = 'none';
        muteIcon.style.display = 'block';
    }
});

// Skip forward functionality (10 seconds)
forwardButton.addEventListener('click', () => {
    audio.currentTime += 10;
});

// Skip backward functionality (10 seconds)
backwardButton.addEventListener('click', () => {
    audio.currentTime -= 10;
});

// Update progress bar as audio plays
audio.addEventListener('timeupdate', () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    progressSlider.value = progress;
});

// Seek audio position when progress bar is moved
progressSlider.addEventListener('input', () => {
    const seekTime = (progressSlider.value / 100) * audio.duration;
    audio.currentTime = seekTime;
});
