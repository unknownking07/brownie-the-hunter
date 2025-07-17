"use client";

import { useEffect, useState, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import Image from "next/image";

// Types for grid tiles
const GRID_SIZE = 5;
const GAME_TIME = 30; // seconds
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

function getRandomPositions(count: number, exclude: { x: number; y: number }[] = []): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  while (positions.length < count) {
    const pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
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

export default function Home() {
  const [grid, setGrid] = useState(
    Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(TILE_EMPTY))
  );
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [bonesLeft, setBonesLeft] = useState(NUM_BONES);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(GAME_TIME);
  const [gameOver, setGameOver] = useState(false);
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

  // Initialize grid with bones and mud
  useEffect(() => {
    const playerStart = { x: 0, y: 0 };
    const bonePositions = getRandomPositions(NUM_BONES, [playerStart]);
    const mudPositions = getRandomPositions(
      NUM_MUDS,
      [playerStart, ...bonePositions]
    );
    const newGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(TILE_EMPTY));
    bonePositions.forEach((pos) => {
      newGrid[pos.y][pos.x] = TILE_BONE;
    });
    mudPositions.forEach((pos) => {
      newGrid[pos.y][pos.x] = TILE_MUD;
    });
    setGrid(newGrid);
    setPlayer(playerStart);
    setBonesLeft(NUM_BONES);
    setScore(0);
    setTimer(GAME_TIME);
    setGameOver(false);
    setIsSlowed(false);
    setShowShare(false);
  }, []);

  // Timer
  useEffect(() => {
    if (gameOver) return;
    if (timer <= 0) {
      setGameOver(true);
      setShowShare(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, gameOver]);

  // Keyboard controls
  useEffect(() => {
    if (gameOver) return;
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
  }, [player, grid, isSlowed, gameOver]);

  // Move player
  function movePlayer(dx: number, dy: number) {
    const newX = Math.max(0, Math.min(GRID_SIZE - 1, player.x + dx));
    const newY = Math.max(0, Math.min(GRID_SIZE - 1, player.y + dy));
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
    if (bonesLeft === 0 && !gameOver) {
      setGameOver(true);
      setShowShare(true);
    }
  }, [bonesLeft, gameOver]);

  // Cleanup mud timeout
  useEffect(() => {
    return () => {
      if (mudTimeout.current) clearTimeout(mudTimeout.current);
    };
  }, []);

  // Restart game
  function restart() {
    window.location.reload(); // simplest way to reset everything
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

  return (
    <main className="min-h-screen p-4 flex flex-col items-center justify-center bg-[#6B3F1D] text-white">
      <h1 className="text-2xl font-bold mb-2">🐶 Brownie’s Bone Hunt</h1>
      <p className="text-sm mb-2">Use arrow keys to move. Collect 🦴, avoid 💩!</p>
      <div className="flex gap-6 mb-4">
        <span>⏰ {timer}s</span>
        <span>🦴 {score}</span>
      </div>
      <div
        className="grid gap-1 mb-4"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 2.5rem)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 2.5rem)`,
          background: "#4B2E13",
          borderRadius: 12,
          padding: 8,
        }}
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
                : TILE_EMOJI[tile]}
            </div>
          ))
        )}
      </div>
      {gameOver ? (
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
