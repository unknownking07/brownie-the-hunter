"use client";

import { useEffect, useState, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import Image from "next/image";

// Types for grid tiles
const START_GRID_SIZE = 5;
const MAX_GRID_SIZE = 9;
const MAX_LEVEL = 69;
const START_GAME_TIME = 30; // seconds
const MIN_GAME_TIME = 10; // seconds
const NUM_BONES = 6;
const NUM_MUDS = 4;

// Tile types
const TILE_EMPTY = "empty";
const TILE_BONE = "bone";
const TILE_MUD = "mud";

// Emoji for each tile
const TILE_EMOJI = {
  [TILE_EMPTY]: "🌱",
  [TILE_BONE]: "🦴",
  [TILE_MUD]: "💩",
};

// Dog sprite
const DOG_EMOJI = "🐶";

function getRandomPositions(
  count: number,
  gridSize: number,
  exclude: { x: number; y: number }[] = []
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  while (positions.length < count) {
    const pos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
    if (
      !positions.some((p) => p.x === pos.x && p.y === pos.y) &&
      !exclude.some((p) => p.x === pos.x && p.y === pos.y)
    ) {
      positions.push(pos);
    }
  }
  return positions;
}

// Simple swipe detection hook
import { useRef as useReactRef } from "react";

function useSwipe(onSwipe: (dx: number, dy: number) => void) {
  const touchStart = useReactRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) onSwipe(dx > 0 ? 1 : -1, 0);
    } else {
      if (Math.abs(dy) > 30) onSwipe(0, dy > 0 ? 1 : -1);
    }
    touchStart.current = null;
  }
  return { onTouchStart, onTouchEnd };
}

export default function Home() {
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(START_GRID_SIZE);
  const [grid, setGrid] = useState(
    Array(START_GRID_SIZE)
      .fill(null)
      .map(() => Array(START_GRID_SIZE).fill(TILE_EMPTY))
  );
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [bonesLeft, setBonesLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(START_GAME_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [username, setUserName] = useState("unknownking");
  const [leaderboard, setLeaderboard] = useState([]); // stub
  const [showShare, setShowShare] = useState(false);
  const mudTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSlowed, setIsSlowed] = useState(false);

  // Setup Farcaster MiniApp SDK
  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.warn("Farcaster SDK error", e);
      }
    };
    init();
  }, []);

  // Helper to get per-level config
  function getLevelConfig(level: number) {
    const gridSize = Math.min(START_GRID_SIZE + Math.floor((level - 1) / 10), MAX_GRID_SIZE);
    const bones = Math.min(3 + Math.floor(level * 1.1), gridSize * gridSize - 2);
    const mud = Math.min(2 + Math.floor(level / 2), gridSize * gridSize - bones - 1);
    const timer = Math.max(START_GAME_TIME - Math.floor(level * 0.4), MIN_GAME_TIME);
    return { gridSize, bones, mud, timer };
  }

  // Initialize grid for current level
  useEffect(() => {
    const { gridSize, bones, mud, timer } = getLevelConfig(level);
    setGridSize(gridSize);
    const playerStart = { x: 0, y: 0 };
    const bonePositions = getRandomPositions(bones, gridSize, [playerStart]);
    const mudPositions = getRandomPositions(
      mud,
      gridSize,
      [playerStart, ...bonePositions]
    );
    const newGrid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(TILE_EMPTY));
    bonePositions.forEach((pos) => {
      newGrid[pos.y][pos.x] = TILE_BONE;
    });
    mudPositions.forEach((pos) => {
      newGrid[pos.y][pos.x] = TILE_MUD;
    });
    setGrid(newGrid);
    setPlayer(playerStart);
    setBonesLeft(bones);
    setTimer(timer);
    setIsSlowed(false);
    setLevelComplete(false);
    setShowShare(false);
    setGameOver(false);
    // Only reset score on level 1
    if (level === 1) setScore(0);
  }, [level]);

  // Timer
  useEffect(() => {
    if (gameOver || levelComplete) return;
    if (timer <= 0) {
      setGameOver(true);
      setShowShare(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, gameOver, levelComplete]);

  // Keyboard controls
  useEffect(() => {
    if (gameOver || levelComplete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSlowed) return;
      let dx = 0,
        dy = 0;
      if (e.key === "ArrowUp") dy = -1;
      else if (e.key === "ArrowDown") dy = 1;
      else if (e.key === "ArrowLeft") dx = -1;
      else if (e.key === "ArrowRight") dx = 1;
      else return;
      e.preventDefault();
      movePlayer(dx, dy);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, grid, isSlowed, gameOver, levelComplete]);

  // Move player
  function movePlayer(dx: number, dy: number) {
    const newX = Math.max(0, Math.min(gridSize - 1, player.x + dx));
    const newY = Math.max(0, Math.min(gridSize - 1, player.y + dy));
    if (newX === player.x && newY === player.y) return;
    const tile = grid[newY][newX];
    if (tile === TILE_BONE) {
      setScore((s) => s + 1);
      setBonesLeft((b) => b - 1);
      updateGrid(newX, newY, TILE_EMPTY);
    } else if (tile === TILE_MUD) {
      setIsSlowed(true);
      mudTimeout.current = setTimeout(() => setIsSlowed(false), 700);
    }
    setPlayer({ x: newX, y: newY });
  }

  // Update grid after collecting bone
  function updateGrid(x: number, y: number, newType: string) {
    setGrid((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[y][x] = newType;
      return copy;
    });
  }

  // End game if all bones collected
  useEffect(() => {
    if (bonesLeft === 0 && !gameOver && !levelComplete) {
      if (level < MAX_LEVEL) {
        setLevelComplete(true);
        setTimeout(() => setLevel((l) => l + 1), 1200);
      } else {
        setGameOver(true);
        setShowShare(true);
      }
    }
  }, [bonesLeft, gameOver, level, levelComplete]);

  // Cleanup mud timeout
  useEffect(() => {
    return () => {
      if (mudTimeout.current) clearTimeout(mudTimeout.current);
    };
  }, []);

  // Restart game
  function restart() {
    setLevel(1);
    setScore(0);
    setGameOver(false);
    setLevelComplete(false);
    setShowShare(false);
  }

  // Share button stub
  function shareScore() {
    // TODO: Integrate with Farcaster share
    alert(`Share: I collected ${score} bones in Brownie’s Bone Hunt!`);
  }

  // Leaderboard stub
  function showLeaderboard() {
    alert("Leaderboard coming soon!");
  }

  // Swipe support
  const swipeHandlers = useSwipe((dx, dy) => {
    if (!gameOver && !levelComplete && !isSlowed) movePlayer(dx, dy);
  });

  return (
    <main className="min-h-screen p-4 flex flex-col items-center justify-center bg-[#6B3F1D] text-white">
      <h1 className="text-2xl font-bold mb-2">🐶 Brownie’s Bone Hunt</h1>
      <p className="text-sm mb-2">Level {level} / {MAX_LEVEL} &bull; Use arrow keys to move. Collect 🦴, avoid 💩!</p>
      <div className="flex gap-6 mb-4">
        <span>⏰ {timer}s</span>
        <span>🦴 {score}</span>
      </div>
      <div
        className="grid gap-1 mb-4"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 2.5rem)`,
          gridTemplateRows: `repeat(${gridSize}, 2.5rem)`,
          background: "#4B2E13",
          borderRadius: 12,
          padding: 8,
        }}
        {...swipeHandlers}
      >
        {grid.map((row, y) =>
          row.map((tile, x) => (
            <div
              key={`${x},${y}`}
              className={`flex items-center justify-center text-2xl rounded-lg border border-[#8B5E3C] ${
                player.x === x && player.y === y
                  ? "bg-yellow-200 text-brown-800 shadow-lg"
                  : tile === TILE_MUD
                  ? "bg-[#7B4F2A]"
                  : "bg-[#6B3F1D]"
              }`}
              style={{ width: 40, height: 40 }}
            >
              {player.x === x && player.y === y
                ? DOG_EMOJI
                : tile === TILE_EMPTY
                ? ""
                : TILE_EMOJI[tile as keyof typeof TILE_EMOJI]}
            </div>
          ))
        )}
      </div>
      {/* On-screen arrow buttons for mobile/touch */}
      <div className="flex gap-2 flex-col items-center mt-2 select-none md:hidden">
        <div className="flex gap-2">
          <button
            aria-label="Up"
            className="w-10 h-10 rounded-full bg-yellow-700 text-white text-2xl flex items-center justify-center shadow"
            onClick={() => !gameOver && !levelComplete && !isSlowed && movePlayer(0, -1)}
          >
            ↑
          </button>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Left"
            className="w-10 h-10 rounded-full bg-yellow-700 text-white text-2xl flex items-center justify-center shadow"
            onClick={() => !gameOver && !levelComplete && !isSlowed && movePlayer(-1, 0)}
          >
            ←
          </button>
          <button
            aria-label="Down"
            className="w-10 h-10 rounded-full bg-yellow-700 text-white text-2xl flex items-center justify-center shadow"
            onClick={() => !gameOver && !levelComplete && !isSlowed && movePlayer(0, 1)}
          >
            ↓
          </button>
          <button
            aria-label="Right"
            className="w-10 h-10 rounded-full bg-yellow-700 text-white text-2xl flex items-center justify-center shadow"
            onClick={() => !gameOver && !levelComplete && !isSlowed && movePlayer(1, 0)}
          >
            →
          </button>
        </div>
      </div>
      {levelComplete && !gameOver ? (
        <div className="text-center mb-4">
          <p className="text-xl font-bold mb-2">Level {level} Complete!</p>
          <p className="text-base">Get ready for the next level...</p>
        </div>
      ) : gameOver && level === MAX_LEVEL ? (
        <div className="text-center mb-4">
          <p className="text-xl font-bold mb-2">congrats you horny dog 😏</p>
          <button
            onClick={restart}
            className="mt-2 px-4 py-2 bg-yellow-700 text-white rounded-xl mr-2"
          >
            Restart
          </button>
        </div>
      ) : gameOver ? (
        <div className="text-center mb-4">
          <p className="text-xl font-bold mb-2">
            Game Over! You collected {score} bone{score === 1 ? "" : "s"}.
          </p>
          <button
            onClick={restart}
            className="mt-2 px-4 py-2 bg-yellow-700 text-white rounded-xl mr-2"
          >
            Restart
          </button>
          <button
            onClick={showLeaderboard}
            className="mt-2 px-4 py-2 bg-yellow-900 text-white rounded-xl mr-2"
          >
            Leaderboard
          </button>
          <button
            onClick={shareScore}
            className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-xl"
          >
            Share
          </button>
        </div>
      ) : isSlowed ? (
        <div className="mb-2 text-yellow-200">Stuck in mud! 🐾</div>
      ) : null}
      <p className="mt-6 text-xs text-white/80">Built by @unknownking</p>
    </main>
  );
}
