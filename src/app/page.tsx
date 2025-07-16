"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import confetti from "canvas-confetti";
import Image from "next/image";

const GRID_SIZE = 5;
const MEME_IMG = "/A_2D_digital_illustration_meme_features_a_cartoon_.png";

type Tile = "empty" | "bone" | "mud";

export default function Home() {
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [dogPos, setDogPos] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [userName, setUserName] = useState<string>("You");

  const generateGrid = () => {
    const newGrid: Tile[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const rand = Math.random();
        if (rand < 0.15 + level * 0.01) row.push("bone");
        else if (rand < 0.25 + level * 0.01) row.push("mud");
        else row.push("empty");
      }
      newGrid.push(row);
    }
    newGrid[0][0] = "empty";
    return newGrid;
  };

  const restartLevel = () => {
    setGrid(generateGrid());
    setDogPos({ x: 0, y: 0 });
    setScore(0);
    setTimeLeft(Math.max(10, 30 - level)); // Faster timer per level
    setGameOver(false);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const user = await sdk.getCurrentUser?.();
        if (user?.viewerContext?.canInteract && user.fid) {
          setUserName(user.username || "You");
        }
      } catch (e) {
        console.warn("Farcaster SDK error", e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameOver) {
      setGameOver(true);
    }
  }, [timeLeft, gameOver]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      let { x, y } = dogPos;
      if (e.key === "ArrowUp" && y > 0) y--;
      if (e.key === "ArrowDown" && y < GRID_SIZE - 1) y++;
      if (e.key === "ArrowLeft" && x > 0) x--;
      if (e.key === "ArrowRight" && x < GRID_SIZE - 1) x++;

      const tile = grid[y]?.[x];
      if (tile === "bone") setScore((s) => s + 1);

      const updated = [...grid];
      updated[y][x] = "empty";
      setGrid(updated);

      if (tile === "mud") {
        setTimeout(() => setDogPos({ x, y }), 500);
      } else {
        setDogPos({ x, y });
      }

      // 🎯 Win Condition: Advance Level
      if (score + 1 >= level * 3) {
        if (level === 69) {
          confetti();
          setGameOver(true);
        } else {
          confetti();
          setLevel((lvl) => lvl + 1);
          restartLevel();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dogPos, grid, score, gameOver, level]);

  useEffect(() => {
    restartLevel();
  }, [level]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-orange-100 p-4">
      <h1 className="text-3xl font-bold mb-2">🐶 Brownie’s Bone Hunt 🦴</h1>
      <p className="mb-1">👤 Player: {userName}</p>
      <p className="mb-1">🎮 Level: {level}</p>
      <p className="mb-1">🦴 Score: {score}</p>
      <p className="mb-3">⏱ Time Left: {timeLeft}s</p>

      <div className="grid grid-cols-5 gap-1 my-4">
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
        <div className="text-center mt-4">
          {level === 69 ? (
            <>
              <p className="text-xl font-bold mb-2">
                🎉 Congrats you horny dog! You finished level 69!
              </p>
              <Image
                src={MEME_IMG}
                alt="Horny Dog Meme"
                width={400}
                height={400}
                className="rounded-xl shadow-lg"
              />
            </>
          ) : (
            <>
              <p className="text-xl font-bold mb-2">
                ⌛ Game Over! You reached level {level}.
              </p>
              <button
                onClick={restartLevel}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
