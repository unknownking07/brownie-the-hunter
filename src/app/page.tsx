"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { sdk } from "@farcaster/miniapp-sdk";
import Image from "next/image";

const GRID_SIZE = 5;
const MAX_LEVEL = 69;
const MEME_IMG = "/A_2D_digital_illustration_meme_features_a_cartoon_.png";

type Tile = "empty" | "bone" | "mud";

export default function Home() {
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [dogPos, setDogPos] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [userName, setUserName] = useState("You");
  const [missionComplete, setMissionComplete] = useState(false);

  // ✅ Farcaster user fetch
  useEffect(() => {
    const init = async () => {
      try {
        const user = await sdk?.user?.getCurrentUser?.();
        if (user?.viewerContext?.canInteract && user.fid) {
          setUserName(user.username || "You");
        }
      } catch (e) {
        console.warn("Farcaster SDK error", e);
      }
    };
    init();
  }, []);

  // 🎯 Mission: Collect 3 bones per level
  const bonesNeeded = 3 + level;

  const generateGrid = () => {
    const newGrid: Tile[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const rand = Math.random();
        if (rand < 0.15 + level * 0.005) row.push("bone");
        else if (rand < 0.25 + level * 0.01) row.push("mud");
        else row.push("empty");
      }
      newGrid.push(row);
    }
    newGrid[0][0] = "empty"; // Starting tile safe
    return newGrid;
  };

  const restartLevel = () => {
    setGrid(generateGrid());
    setDogPos({ x: 0, y: 0 });
    setScore(0);
    setTimeLeft(Math.max(10, 30 - level));
    setGameOver(false);
    setMissionComplete(false);
  };

  useEffect(() => {
    if (!gameOver && !missionComplete) {
      if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameOver(true);
      }
    }
  }, [timeLeft, gameOver, missionComplete]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver || missionComplete) return;
      let { x, y } = dogPos;
      if (e.key === "ArrowUp" && y > 0) y--;
      if (e.key === "ArrowDown" && y < GRID_SIZE - 1) y++;
      if (e.key === "ArrowLeft" && x > 0) x--;
      if (e.key === "ArrowRight" && x < GRID_SIZE - 1) x++;

      const tile = grid[y]?.[x];
      if (tile === "bone") {
        const newScore = score + 1;
        setScore(newScore);
        if (newScore >= bonesNeeded) {
          confetti();
          setMissionComplete(true);
        }
      }

      if (tile === "mud") {
        setTimeout(() => setDogPos({ x, y }), 300);
      } else {
        setDogPos({ x, y });
      }

      const updated = [...grid];
      updated[y][x] = "empty";
      setGrid(updated);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dogPos, grid, gameOver, missionComplete, score]);

  useEffect(() => {
    restartLevel();
  }, [level]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-orange-100 p-4 text-center">
      <h1 className="text-3xl font-bold mb-4 text-brown-700">🐶 Brownie’s Bone Hunt 🦴</h1>
      <p className="mb-1 text-brown-800">👤 Player: {userName}</p>
      <p className="mb-1 text-brown-800">🎮 Level: {level}</p>
      <p className="mb-1 text-brown-800">⏱ Time Left: {timeLeft}s</p>
      <p className="mb-4 text-brown-800">🦴 Bones Collected: {score}/{bonesNeeded}</p>

      <div className="grid grid-cols-5 gap-1 my-2">
        {grid.map((row, y) =>
          row.map((tile, x) => {
            const isDog = dogPos.x === x && dogPos.y === y;
            let content = "";
            if (isDog) content = "🐶";
            else if (tile === "bone") content = "🦴";
            else if (tile === "mud") content = "💩";
            return (
              <div
                key={`${x}-${y}`}
                className="w-12 h-12 bg-white border flex items-center justify-center text-2xl rounded shadow"
              >
                {content}
              </div>
            );
          })
        )}
      </div>

      {gameOver && (
        <div className="mt-4">
          <p className="text-xl font-semibold text-red-600">💀 Time’s up! Try again.</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={restartLevel}
          >
            Retry Level
          </button>
        </div>
      )}

      {missionComplete && (
        <div className="mt-4">
          {level === MAX_LEVEL ? (
            <>
              <h2 className="text-2xl font-bold text-pink-600">🎉 Congrats you horny dog! 🐕</h2>
              <Image src={MEME_IMG} alt="Horny dog meme" width={300} height={300} className="rounded mt-4" />
            </>
          ) : (
            <>
              <p className="text-green-700 text-xl font-semibold">🎯 Mission Complete!</p>
              <button
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                onClick={() => setLevel((lvl) => lvl + 1)}
              >
                Go to Level {level + 1}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
