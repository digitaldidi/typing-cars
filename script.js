// ===========================
// GLOBAL GAME VARIABLES
// ===========================

// No shared prefixes within the same level
const wordsByLevel = {
    1: ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    2: ["asd", "sgf", "dhk", "fjh", "gkl", "lad"],
    3: ["asdf", "gfhk", "djkl", "shjl", "lgda"],
    4: ["asdfg", "ghfdk", "djkls", "slgjh", "lkjhd"],
  };
  
  let score = 0;
  let level = 1;
  
  // Car spawn interval (ms)
  let spawnDelay = 4000;  
  // Car speed in px per update
  let carSpeed = 2;       
  // Minimally how fast we can spawn
  const minSpawnDelay = 1500;
  
  // Max number of cars on screen
  const maxCarsOnScreen = 3;
  
  // How many correct cars per level
  const carsPerLevel = 10;  // "longer to progress"
  
  // Timers
  let gameInterval;
  let moveInterval;
  
  // ===========================
  // DOM ELEMENTS
  // ===========================
  const gameContainer = document.getElementById("game-container");
  const typingInput = document.getElementById("typing-input");
  const startBtn = document.getElementById("start-btn");
  const scoreDisplay = document.getElementById("score-display");
  const levelDisplay = document.getElementById("level-display");
  const errorSound = document.getElementById("error-sound");
  const revSound = document.getElementById("rev-sound");
  
  // ===========================
  // EVENT LISTENERS
  // ===========================
  startBtn.addEventListener("click", startGame);
  typingInput.addEventListener("input", handleTyping);
  
  // ===========================
  // GAME LOGIC
  // ===========================
  function startGame() {
    resetGame();
    gameInterval = setInterval(spawnCar, spawnDelay);
    moveInterval = setInterval(updateCarPositions, 50);
  }
  
  function resetGame() {
    score = 0;
    level = 1;
    spawnDelay = 4000;
    carSpeed = 2;
    
    scoreDisplay.textContent = "Score: " + score;
    levelDisplay.textContent = "Level: " + level;
  
    // Remove any existing cars
    const existingCars = document.querySelectorAll(".car");
    existingCars.forEach(car => car.remove());
    
    // Clear intervals
    clearInterval(gameInterval);
    clearInterval(moveInterval);
  
    // Clear the typing input
    typingInput.value = "";
  }
  
  function spawnCar() {
    // Limit how many cars can be on screen
    const currentCars = document.querySelectorAll(".car");
    if (currentCars.length >= maxCarsOnScreen) {
      return; // Skip spawning a new one
    }
  
    const randomWord = getRandomWord(level);
    const carElem = document.createElement("div");
    carElem.classList.add("car");
  
    carElem.innerHTML = `
      <img 
        src="https://img.icons8.com/doodle/96/000000/car--v1.png" 
        alt="Car"
      >
      <span>${randomWord}</span>
    `;
  
    const safeTop = getSafeTopPosition();
    carElem.style.top = safeTop + "px";
    carElem.style.left = gameContainer.clientWidth + "px";
  
    gameContainer.appendChild(carElem);
  
    // Highlight the leading car after each spawn
    highlightLeadingCar();
  }
  
  function updateCarPositions() {
    const cars = document.querySelectorAll(".car");
    
    cars.forEach(car => {
      const currentLeft = parseInt(window.getComputedStyle(car).left, 10) || 0;
      car.style.left = (currentLeft - carSpeed) + "px";
  
      // If car goes off screen on the left, remove it
      if (currentLeft < -150) {
        car.remove();
        highlightLeadingCar();
      }
    });
  }
  
  /**
   * Handle partial matching:
   * 1) If typed string is longer than the word => error
   * 2) If typed string is not a prefix of the word => error
   * 3) If typed string matches the full word => success (remove car, play rev sound)
   * 4) Otherwise, keep typing (no error).
   */
  function handleTyping(e) {
    const typedText = e.target.value;
    const leadingCar = getLeadingCar();
  
    // If no cars on screen or no typed text, do nothing
    if (!leadingCar || !typedText) return;
  
    const leadingWord = leadingCar.querySelector("span").textContent;
  
    // 1) If typed text is longer than the leading word => error
    if (typedText.length > leadingWord.length) {
      showErrorFeedback();
      e.target.value = "";
      return;
    }
  
    // 2) If typed text is not a prefix => error
    if (!leadingWord.startsWith(typedText)) {
      showErrorFeedback();
      e.target.value = "";
      return;
    }
  
    // 3) If typed text == leading word => success
    if (typedText === leadingWord) {
      // Remove car
      leadingCar.remove();
      score++;
      scoreDisplay.textContent = "Score: " + score;
      e.target.value = ""; // clear input
  
      // Positive reinforcement sound
      if (revSound) {
        revSound.currentTime = 0;
        revSound.play().catch(() => {});
      }
  
      // Possibly increase difficulty
      maybeIncreaseDifficulty();
      
      // Highlight the next leading car
      highlightLeadingCar();
    }
    // 4) Otherwise, partial match => do nothing. Let the player keep typing.
  }
  
  /**
   * Play error sound, shake the input box.
   */
  function showErrorFeedback() {
    // Play error sound
    if (errorSound) {
      errorSound.currentTime = 0;
      errorSound.play().catch(() => {});
    }
  
    // Shake animation
    typingInput.classList.add("shake");
    setTimeout(() => {
      typingInput.classList.remove("shake");
    }, 300);
  }
  
  /**
   * Level up every 10 cars.
   */
  function maybeIncreaseDifficulty() {
    if (score % carsPerLevel === 0) {
      level++;
      levelDisplay.textContent = "Level: " + level;
  
      // Increase spawn rate, up to a limit
      spawnDelay = Math.max(minSpawnDelay, spawnDelay - 500);
      // Speed up cars
      carSpeed++;
  
      // Re-init the spawn interval
      clearInterval(gameInterval);
      gameInterval = setInterval(spawnCar, spawnDelay);
    }
  }
  
  // ===========================
  // HELPER FUNCTIONS
  // ===========================
  
  /**
   * Returns a 'top' value for the new car so it won't overlap existing cars.
   */
  function getSafeTopPosition() {
    const cars = document.querySelectorAll(".car");
    const carHeight = 120; 
    const maxTop = gameContainer.clientHeight - carHeight;
  
    let tries = 0;
    let overlap = true;
    let newTop;
  
    while (overlap && tries < 50) {
      newTop = Math.floor(Math.random() * maxTop);
      overlap = false;
      
      cars.forEach((car) => {
        const existingTop = parseInt(car.style.top, 10) || 0;
        if (Math.abs(existingTop - newTop) < carHeight) {
          overlap = true;
        }
      });
      tries++;
    }
    return newTop;
  }
  
  /**
   * Pick a random word from the current level.
   * If the level is too high, use the highest level's word list.
   */
  function getRandomWord(currentLevel) {
    const levelWords = wordsByLevel[currentLevel];
    if (!levelWords) {
      // If we exceed defined levels, use the highest available.
      const maxLevel = Math.max(...Object.keys(wordsByLevel).map(Number));
      return pickRandom(wordsByLevel[maxLevel]);
    }
    return pickRandom(levelWords);
  }
  
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  /**
   * Find the front-most car – the one with the smallest left value.
   */
  function getLeadingCar() {
    const cars = Array.from(document.querySelectorAll(".car"));
    if (!cars.length) return null;
  
    // Sort by left position ascending
    cars.sort((a, b) => {
      const aLeft = parseInt(a.style.left, 10);
      const bLeft = parseInt(b.style.left, 10);
      return aLeft - bLeft;
    });
  
    return cars[0];
  }
  
  /**
   * Highlight only the leading car (remove highlight from others).
   */
  function highlightLeadingCar() {
    const cars = document.querySelectorAll(".car");
    cars.forEach(car => {
      car.classList.remove("leading");
    });
  
    const leading = getLeadingCar();
    if (leading) {
      leading.classList.add("leading");
    }
  }
  