"use client";

import { useState, useEffect, useRef, useCallback, RefObject } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ethers } from "ethers";
import {
  getLeaderboard,
  submitScoreToContract,
} from "./services/contractService";

const backgroundImage = "/Images/bgdia.png";
const baseImage = "/Images/basex5.jpg";
const birdImage = "/Images/pajaroaletabaja.png";
const birdFlyingImage = "/Images/pajaroaletaalta.png";
const tubeImage = "/Images/botpipe.png";
const ding = "/audio/point.ogg";
const hitSound = "/audio/hit.wav";
const flapSound = "/audio/wing.ogg";

interface TubeData {
  x: number;
  yUpper: number;
  yLower: number;
}

const gravity = -0.4;
const tubeWidth = 82;
const tubeHeight = 320;
const tubeGap = 500;
const tubeSpeed = 5;

const generateRandomTubePosition = (): TubeData => {
  const minY = window.innerHeight * -0.01;
  const maxY = window.innerHeight * -0.15;
  const randomY = Math.random() * (maxY - minY) + minY;
  return { x: window.innerWidth, yUpper: randomY, yLower: randomY - 10 };
};

const Tube = ({ tube, index }: { tube: TubeData; index: number }) => (
  <div
    className="tube"
    style={{ position: "absolute", left: tube.x, bottom: 0 }}
  >
    <img
      className={`tube-upper tube-upper-${index}`}
      src={tubeImage}
      alt="Tube"
      style={{
        width: tubeWidth,
        height: tubeHeight,
        bottom: window.innerHeight - tube.yUpper - tubeHeight,
      }}
    />
    <img
      className={`tube-lower tube-lower-${index}`}
      src={tubeImage}
      alt="Tube"
      style={{
        width: tubeWidth,
        height: tubeHeight,
        bottom: tube.yLower,
        zIndex: 0,
      }}
    />
  </div>
);

export default function App() {
  const hitAudioRef = useRef<HTMLAudioElement | null>(null);
  const dingAudioRef = useRef<HTMLAudioElement | null>(null);
  const flapAudioRef = useRef<HTMLAudioElement | null>(null);
  const baseRef = useRef<HTMLImageElement | null>(null);
  const animateRef = useRef<number | null>(null);

  const [basePosition, setBasePosition] = useState(0);
  const [birdPosition, setBirdPosition] = useState(0);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [tubes, setTubes] = useState<TubeData[]>([]);
  const [flapSprite, setFlapSprite] = useState(true);
  const [mounted, setMounted] = useState(false);

  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isRightNetwork = chainId === 80002;
  const [leaderboard, setLeaderboard] = useState<
    { player: string; score: number }[]
  >([]);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [canRestart, setCanRestart] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      setBirdPosition(window.innerHeight / 2);
      const savedHighestScore = localStorage.getItem("highestScore");
      if (savedHighestScore) {
        setHighestScore(parseInt(savedHighestScore, 10));
      }
    }, 0);

    const fetchLeaderboard = async () => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          "https://polygon-amoy.drpc.org",
        );
        const data = await getLeaderboard(provider);
        setLeaderboard(data);
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      }
    };
    fetchLeaderboard();

    return () => clearTimeout(t);
  }, []);

  const playAudio = (audioElementRef: RefObject<HTMLAudioElement | null>) => {
    if (audioElementRef && audioElementRef.current) {
      audioElementRef.current.play().catch((error) => {
        console.error("Error playing sound:", error);
      });
    }
  };

  const handleJump = useCallback(() => {
    if (!gameOver) {
      playAudio(flapAudioRef);
      setBirdVelocity(7);
    }
  }, [gameOver]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!gameStarted && e.keyCode === 32) {
        if (!isConnected) return;
        setGameStarted(true);
        playAudio(dingAudioRef);
      } else if (gameStarted && !gamePaused && e.keyCode === 32) {
        handleJump();
      } else if (
        (e.keyCode === 80 || e.keyCode === 27 || e.keyCode === 32) &&
        gameStarted &&
        !gameOver
      ) {
        setGamePaused((prevPaused) => !prevPaused);
      }
    },
    [gameStarted, gamePaused, gameOver, handleJump, isConnected],
  );

  const restartGame = useCallback(() => {
    setBasePosition(0);
    setBirdPosition(window.innerHeight / 2);
    setBirdVelocity(0);
    setGameStarted(false);
    setGamePaused(false);
    setGameOver(false);
    setScore(0);
    setTubes([]);
  }, []);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.keyCode === 32 && gameOver && canRestart && !isSubmittingScore) {
        restartGame();
      }
    },
    [gameOver, restartGame, canRestart, isSubmittingScore],
  );

  const handleScreenClick = useCallback(() => {
    if (!gameStarted) {
      if (!isConnected || !isRightNetwork) return;
      setGameStarted(true);
      playAudio(dingAudioRef);
    } else if (!gamePaused && !gameOver) {
      handleJump();
    } else if (gameOver && canRestart && !isSubmittingScore) {
      restartGame();
    }
  }, [
    gameStarted,
    gamePaused,
    gameOver,
    handleJump,
    restartGame,
    isConnected,
    isRightNetwork,
    canRestart,
    isSubmittingScore,
  ]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;

    if (gameOver) {
      if (score > highestScore) {
        t = setTimeout(() => setHighestScore(score), 0);
        playAudio(dingAudioRef);
        localStorage.setItem("highestScore", score.toString());
      }

      const win = window as any;
      if (typeof window !== "undefined" && win.ethereum) {
        setTimeout(() => setIsSubmittingScore(true), 0);
        const provider = new ethers.providers.Web3Provider(win.ethereum);
        const signer = provider.getSigner();
        submitScoreToContract(signer, score)
          .then((res) => {
            console.log("Score submitted:", res);
            setTimeout(() => setIsSubmittingScore(false), 0);
            getLeaderboard(provider).then(setLeaderboard);
          })
          .catch((err) => {
            console.error(err);
            setTimeout(() => setIsSubmittingScore(false), 0);
          });
      }
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [gameOver, score, highestScore]);

  useEffect(() => {
    if (gameOver) {
      setTimeout(() => setCanRestart(false), 0);
      const t = setTimeout(() => setCanRestart(true), 1500);
      return () => clearTimeout(t);
    }
  }, [gameOver]);

  useEffect(() => {
    const flapInterval = setInterval(() => {
      setFlapSprite((prev) => !prev);
    }, 150);
    return () => clearInterval(flapInterval);
  }, []);

  useEffect(() => {
    const detectBaseCollision = () => {
      const birdEl = document.querySelector(".bird");
      if (!birdEl || !baseRef.current) return;
      const birdRect = birdEl.getBoundingClientRect();
      const baseRect = baseRef.current.getBoundingClientRect();
      if (birdRect.bottom >= baseRect.top) {
        setGameOver(true);
        if (animateRef.current) {
          cancelAnimationFrame(animateRef.current);
        }

        if (hitAudioRef.current) {
          playAudio(hitAudioRef);
        }
      }

      tubes.forEach((tube, index) => {
        const upperTubeEl = document.querySelector(`.tube-upper-${index}`);
        const lowerTubeEl = document.querySelector(`.tube-lower-${index}`);
        if (!upperTubeEl || !lowerTubeEl) return;
        const upperTubeRect = upperTubeEl.getBoundingClientRect();
        const lowerTubeRect = lowerTubeEl.getBoundingClientRect();
        if (
          birdRect.right > tube.x &&
          birdRect.left < tube.x + tubeWidth &&
          (birdRect.top < upperTubeRect.bottom ||
            birdRect.bottom > lowerTubeRect.top)
        ) {
          setGameOver(true);
          if (animateRef.current) {
            cancelAnimationFrame(animateRef.current);
          }

          if (hitAudioRef.current) {
            playAudio(hitAudioRef);
          }
        }
      });
    };

    const animate = () => {
      setBirdVelocity((prevVelocity) => prevVelocity + gravity);
      setBirdPosition((prevPosition) => prevPosition + birdVelocity);
      setBasePosition(
        (prevPosition) => (prevPosition + tubeSpeed - 1) % window.innerWidth,
      );

      setTubes((prevTubes) => {
        let incrementScore = false;
        const newTubes = prevTubes
          .map((tube) => {
            const newX = tube.x - tubeSpeed;
            if (newX < 100 && tube.x >= 100) {
              incrementScore = true;
              playAudio(dingAudioRef);
            }
            return { ...tube, x: newX };
          })
          .filter((tube) => tube.x > -tubeWidth);

        if (incrementScore) {
          setScore((prevScore) => prevScore + 1);
        }

        if (
          newTubes.length === 0 ||
          window.innerWidth - newTubes[newTubes.length - 1].x >= tubeGap
        ) {
          newTubes.push(generateRandomTubePosition());
        }

        return newTubes;
      });

      detectBaseCollision();

      const birdEl = document.querySelector(".bird");
      if (birdEl) {
        const birdRect = birdEl.getBoundingClientRect();
        tubes.forEach((tube, index) => {
          const upperTubeEl = document.querySelector(`.tube-upper-${index}`);
          const lowerTubeEl = document.querySelector(`.tube-lower-${index}`);
          if (!upperTubeEl || !lowerTubeEl) return;
          const upperTubeRect = upperTubeEl.getBoundingClientRect();
          const lowerTubeRect = lowerTubeEl.getBoundingClientRect();
          if (
            birdRect.right > tube.x &&
            birdRect.left < tube.x + tubeWidth &&
            (birdRect.top < upperTubeRect.bottom ||
              birdRect.bottom > lowerTubeRect.top)
          ) {
            setGameOver(true);
            if (animateRef.current) {
              cancelAnimationFrame(animateRef.current);
            }
          }
        });
      }

      const baseHeight = 50;
      const birdBottomPosition = birdPosition + 50 - 1;
      if (birdBottomPosition >= window.innerHeight - baseHeight) {
        setGameOver(true);
        if (animateRef.current) {
          cancelAnimationFrame(animateRef.current);
        }
      }

      animateRef.current = requestAnimationFrame(animate);
    };

    if (gameStarted && !gamePaused && !gameOver) {
      animateRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animateRef.current) {
        cancelAnimationFrame(animateRef.current);
      }
    };
  }, [gameStarted, gamePaused, birdVelocity, tubes, gameOver, birdPosition]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="App" onClick={handleScreenClick}>
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 100,
        }}
      >
        <ConnectButton showBalance={false} />
      </div>
      <div
        className={`overlay ${gamePaused || gameOver ? "overlay-dark" : ""}`}
        style={{ display: gamePaused ? "block" : "none" }}
      />
      {gamePaused || gameOver ? (
        <div
          className="overlay"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 9,
          }}
        />
      ) : null}
      <div
        className="overlay"
        style={{ display: gamePaused ? "block" : "none" }}
      />
      <img src={backgroundImage} alt="Background" className="background" />
      {tubes.map((tube, index) => (
        <Tube key={index} tube={tube} index={index} />
      ))}
      <div className="score-display">
        <h1>{score}</h1>
      </div>
      <div className="base-container">
        <img
          src={baseImage}
          alt="Base"
          className="base"
          style={{ left: `${basePosition}px`, bottom: "0", zIndex: 1 }}
          ref={baseRef}
        />
        <img
          src={baseImage}
          alt="Base"
          className="base"
          style={{
            left: `${((basePosition - window.innerWidth + 46) / window.innerWidth) * 100}%`,
          }}
        />
      </div>
      {gamePaused && (
        <div className="pause-message">
          <h1>PAUSED</h1>
          <h2>PRESS ESC OR SPACE TO CONTINUE</h2>
        </div>
      )}
      {gameStarted && !gameOver && (
        <img
          src={flapSprite ? birdFlyingImage : birdImage}
          alt="Bird"
          className={`bird ${birdVelocity < 0 ? "bird-down" : "bird-up"}`}
          style={{ left: "100px", bottom: `${birdPosition}px` }}
        />
      )}

      {gameOver && (
        <div className="pause-message">
          <h1>GAME OVER</h1>
          <h1>SCORE: {score}</h1>
          <h1>HIGHEST SCORE: {highestScore}</h1>

          {isSubmittingScore ? (
            <h2 style={{ color: "yellow", marginTop: "10px" }}>
              Submitting Score to Web3... Check Wallet!
            </h2>
          ) : canRestart ? (
            <h1 style={{ marginTop: "10px" }}>PRESS SPACE TO RESTART</h1>
          ) : null}

          {isConnected && leaderboard.length > 0 && (
            <div
              style={{
                marginTop: "30px",
                fontSize: "1em",
                textAlign: "center",
              }}
            >
              <h2>Top 10 Leaderboard</h2>
              <ol style={{ listStylePosition: "inside", padding: 0 }}>
                {leaderboard.map((entry, idx) => (
                  <li key={idx} style={{ margin: "5px 0" }}>
                    {entry.player.slice(0, 6)}...{entry.player.slice(-4)} :{" "}
                    {entry.score}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      {!gameStarted && !gameOver && (
        <div className="start-message">
          <h1>FLAPPY BIRD</h1>
          <div className="bird-container">
            <img
              src={flapSprite ? birdFlyingImage : birdImage}
              alt="Bird"
              className="start-bird"
              style={{ left: "100px", bottom: `${birdPosition}px` }}
            />{" "}
          </div>
          {isConnecting || isReconnecting ? (
            <h1
              style={{ marginTop: "20px", fontSize: "1.2em", color: "#FFD700" }}
            >
              LOADING WALLET...
            </h1>
          ) : isConnected && isRightNetwork ? (
            <>
              <h1>PRESS SPACE TO START</h1>
              {leaderboard.length > 0 && (
                <div
                  style={{
                    marginTop: "30px",
                    fontSize: "0.8em",
                    textAlign: "center",
                  }}
                >
                  <h2>Top 10 Leaderboard</h2>
                  <ol style={{ listStylePosition: "inside", padding: 0 }}>
                    {leaderboard.map((entry, idx) => (
                      <li key={idx} style={{ margin: "5px 0" }}>
                        {entry.player.slice(0, 6)}...{entry.player.slice(-4)} :{" "}
                        {entry.score}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          ) : isConnected && !isRightNetwork ? (
            <>
              <h1
                style={{
                  marginTop: "20px",
                  fontSize: "1.2em",
                  color: "#FF4444",
                }}
              >
                WRONG NETWORK DETECTED
              </h1>
              <h2 style={{ fontSize: "0.8em" }}>
                Please switch to the Polygon Amoy Testnet to play!
              </h2>
              <button
                onClick={() => switchChain({ chainId: 80002 })}
                style={{
                  marginTop: "20px",
                  padding: "10px 20px",
                  fontSize: "1em",
                  backgroundColor: "#FFD700",
                  color: "#000",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Switch Network
              </button>
            </>
          ) : (
            <>
              <h1
                style={{
                  marginTop: "20px",
                  fontSize: "1.2em",
                  color: "#FFD700",
                }}
              >
                WELCOME TO WEB3 FLAPPY BIRD
              </h1>
              <h2 style={{ fontSize: "0.8em" }}>
                Connect your wallet to play and compete on-chain!
              </h2>
            </>
          )}
        </div>
      )}
      <audio ref={dingAudioRef} src={ding} preload="auto" />
      <audio ref={hitAudioRef} src={hitSound} preload="auto" />
      <audio ref={flapAudioRef} src={flapSound} preload="auto" />
    </div>
  );
}
