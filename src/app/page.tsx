// Final version of app/page.tsx implementing level difficulty scaling
// with faster timer and more mud as level increases, and a custom meme at level 69

"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { sdk } from "@farcaster/miniapp-sdk";

const MEME_IMG = "/A_2D_digital_illustration_meme_features_a_cartoon_.png";

type Tile = "empty" | "bone" | "mud";

export default function Home() {
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [dogPos, setDogPos] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; level: number }[]>([]);
  const [userName, setUserName] = useState("You");
  const [totalBones, setTotalBones] = useState(0);
  const [level, setLevel] = useState(1);
  const [frameUrl, setFrameUrl] = useState("");

  const getLevelSettings = (level: number) => {
    const baseSize = 5 + Math.min(4, level - 1);
    const baseTime = Math.max(10, 30 - level * 2);
    const mudChance = Math.min(0.3, 0.1 + level * 0.02);
    const boneChance = Math.min(0.3, 0.15 + level * 0.01);
    return { size: baseSize, time: baseTime, mudChance, boneChance };
  };

  const getGridColsClass = (size: number) => {
    return {
      5: "grid-cols-5",
      6: "grid-cols-6",
      7: "grid-cols-7",
      8: "grid-cols-8",
      9: "grid-cols-9",
      10: "grid-cols-10",
    }[size] || "grid-cols-5";
  };

  const generateGrid = () => {
    const { size, mudChance, boneChance } = getLevelSettings(level);
    const newGrid: Tile[][] = [];
    let boneCount = 0;

    for (let y = 0; y < size; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < size; x++) {
        const rand = Math.random();
        if (rand < boneChance) {
          row.push("bone");
          boneCount++;
        } else if (rand < boneChance + mudChance) {
          row.push("mud");
        } else {
          row.push("empty");
        }
      }
      row.sort(() => Math.random() - 0.5);
      newGrid.push(row);
    }

    newGrid[0][0] = "empty";
    setTotalBones(boneCount);
    return newGrid;
  };

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setGameOver(true);
      confetti();
    }
  }, [timeLeft, gameOver]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver) return;

      const { size } = getLevelSettings(level);
      let { x, y } = dogPos;

      if (e.key === "ArrowUp" && y > 0) y--;
      if (e.key === "ArrowDown" && y < size - 1) y++;
      if (e.key === "ArrowLeft" && x > 0) x--;
      if (e.key === "ArrowRight" && x < size - 1) x++;

      const tile = grid[y]?.[x];
      if (tile === "bone") {
        const newScore = score + 1;
        setScore(newScore);
        if (newScore === totalBones) {
          setGameOver(true);
          confetti();
          return;
        }
      }

      if (tile === "mud") {
        setTimeout(() => setDogPos({ x, y }), 500);
      } else {
        setDogPos({ x, y });
      }

      const updated = [...grid];
      updated[y][x] = "empty";
      setGrid(updated);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dogPos, grid, gameOver, score, totalBones, level]);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await sdk.user.getCurrentUser();
        if (user?.viewerContext?.canInteract && user.fid) {
          setUserName(user.username || "You");
        }

        const url = await sdk.frame.getCurrentFrameUrl();
        setFrameUrl(url);
      } catch (err) {
        console.log("Farcaster SDK failed", err);
      }

      const { time } = getLevelSettings(level);
      setTimeLeft(time);
      setGrid(generateGrid());
      setDogPos({ x: 0, y: 0 });
      setScore(0);
      setGameOver(false);
    };

    init();
  }, [level]);

  const shareMessage = `🎯 I just completed Level ${level} on 🐶 Brownie's Bone Hunt!\nTry it here 👇\n${frameUrl}`;

  const share = async () => {
    try {
      await sdk.share.publishCast({ text: shareMessage });
      alert("Shared on Farcaster! ✅");
    } catch (err) {
      console.log("Share failed", err);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#d2b48c] p-4 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">🐶 Brownie’s Bone Hunt 🦴</h1>
      <p className="mb-1 font-medium text-lg">⏱ Time Left: {timeLeft}s</p>
      <p className="mb-1 font-medium text-lg">🦴 Score: {score} / {totalBones}</p>
      <p className="mb-4 font-semibold text-sm">Level {level}</p>

      <div className={`grid ${getGridColsClass(getLevelSettings(level).size)} gap-1 my-4`}>
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
        <div className="text-center mt-4 w-full">
          {level === 69 && score === totalBones ? (
            <>
              <p className="text-xl font-bold mb-4">🎉 Congrats you horny dog!</p>
              <img src={MEME_IMG} alt="Naughty pup meme" className="w-80 rounded shadow mx-auto mb-4" />
            </>
          ) : (
            <p className="text-xl font-bold mb-2">
              🎉 {score === totalBones ? "Mission Complete!" : "Game Over!"} You scored {score}!
            </p>
          )}

          {score === totalBones && level < 69 ? (
            <button
              onClick={() => setLevel(level + 1)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mb-4"
            >
              Next Level →
            </button>
          ) : (
            <button
              onClick={() => {
                const newScore = { name: userName, score, level };
                const updated = [...leaderboard, newScore]
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5);
                setLeaderboard(updated);
                setLevel(1);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
            >
              Play Again
            </button>
          )}

          <button
            onClick={share}
            className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 mb-6"
          >
            Share on Farcaster 🟣
          </button>

          <div className="mt-4 bg-white rounded p-4 shadow w-full max-w-sm mx-auto">
            <h2 className="text-lg font-semibold mb-2">🏆 Leaderboard</h2>
            <ol className="text-left space-y-1">
              {leaderboard.map((entry, index) => (
                <li
                  key={index}
                  className={`text-sm ${entry.name === userName ? "font-bold text-purple-800" : ""}`}
                >
                  {index + 1}. {entry.name} — {entry.score} pts (Lvl {entry.level}) {entry.name === userName && "(YOU)"}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </main>
  );
}
