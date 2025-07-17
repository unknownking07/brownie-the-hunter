"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import confetti from "canvas-confetti";
import Image from "next/image";

// Add BoneTile type
type BoneTile = {
  id: number;
  hasBone: boolean;
  collected: boolean;
};

const TOTAL_LEVELS = 69;

export default function Home() {
  const [level, setLevel] = useState(1);
  const [bonesNeeded, setBonesNeeded] = useState(3);
  const [gridSize, setGridSize] = useState(3);
  // Type bones state as BoneTile[]
  const [bones, setBones] = useState<BoneTile[]>([]);
  const [collected, setCollected] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [username, setUserName] = useState("You");
  const [showMeme, setShowMeme] = useState(false);

  // ✅ Get Farcaster viewer
  useEffect(() => {
    const init = async () => {
      try {
        // Use sdk.actions.ready() for compatibility
        if (sdk.actions && sdk.actions.ready) {
          await sdk.actions.ready();
        } else if (sdk.ready) {
          await sdk.ready();
        }
        // Try to get viewer, fallback to default if not available
        const user = sdk.state?.viewer;
        if (user?.canInteract && user.fid) {
          setUserName(user.username || "You");
        }
      } catch (e) {
        console.warn("Farcaster SDK error", e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (collected >= bonesNeeded) {
      if (level === TOTAL_LEVELS) {
        setShowMeme(true);
        setGameOver(true);
        return;
      }
      setLevel((prev) => prev + 1);
      const newBones = Math.min(bonesNeeded + 1, 20);
      setBonesNeeded(newBones);
      setGridSize((g) => Math.min(g + 1, 9));
      setCollected(0);
      confetti();
    }
  }, [collected, bonesNeeded, level]);

  useEffect(() => {
    if (gameOver) return;
    const totalTiles = gridSize * gridSize;
    const newBones = Array.from({ length: totalTiles }, (_, i) => ({
      id: i,
      hasBone: Math.random() < bonesNeeded / totalTiles,
      collected: false,
    }));
    setBones(newBones);
  }, [gridSize, bonesNeeded, level, gameOver]);

  const collect = (id: number) => {
    setBones((prev) =>
      prev.map((b) =>
        b.id === id && b.hasBone && !b.collected
          ? { ...b, collected: true }
          : b
      )
    );
    const target = bones.find((b) => b.id === id);
    if (target?.hasBone && !target.collected) {
      setCollected((c) => c + 1);
    }
  };

  const restart = () => {
    setLevel(1);
    setBonesNeeded(3);
    setGridSize(3);
    setCollected(0);
    setGameOver(false);
    setShowMeme(false);
  };

  return (
    <main className="min-h-screen p-4 flex flex-col items-center justify-center bg-amber-100 text-brown-800">
      <h1 className="text-2xl font-bold mb-2">🐶 Brownie’s Bone Hunt</h1>
      <p className="text-sm mb-4">Level {level} • Bones needed: {bonesNeeded}</p>
      {showMeme ? (
        <div className="text-center">
          <p className="text-xl font-bold mb-2">Congrats you horny dog 😏</p>
          <Image
            src="/A_2D_digital_illustration_meme_features_a_cartoon_.png"
            alt="Dog Meme"
            width={300}
            height={300}
            className="rounded-xl shadow-md"
          />
          <button
            onClick={restart}
            className="mt-4 px-4 py-2 bg-brown-600 text-white rounded-xl"
          >
            Restart
          </button>
        </div>
      ) : (
        <>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              maxWidth: 400,
              width: "100%",
            }}
          >
            {bones.map((tile) => (
              <div
                key={tile.id}
                onClick={() => collect(tile.id)}
                className={`aspect-square flex items-center justify-center text-2xl rounded-xl cursor-pointer select-none border border-brown-400 bg-white ${
                  tile.collected ? "opacity-30" : "hover:bg-yellow-100"
                }`}
              >
                {tile.collected ? "🦴" : tile.hasBone ? "❓" : "🐾"}
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-6 text-xs text-brown-700">Built by @{username}</p>
    </main>
  );
}
