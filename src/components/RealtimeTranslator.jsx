import React, { useState, useRef } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = 'auto';

export default function RealtimeTranslator() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lang, setLang] = useState(null);
  const audioContextRef = useRef(null);

  const handleListen = () => {
    if (!listening) {
      setTranscript("");
      recognition.start();
      setListening(true);

      recognition.onresult = async (event) => {
        const text = event.results[event.resultIndex][0].transcript.trim();
        setTranscript((prev) => prev + " " + text);

        // 1. Detect language
        const detectedLangRes = await fetch("https://libretranslate.de/detect", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text })
        });
        const detected = await detectedLangRes.json();
        const detectedLang = detected[0].language;
        setLang(detectedLang);

        // 2. Translate to the other language
        const targetLang = detectedLang === "it" ? "en" : "it";
        const translateRes = await fetch("https://libretranslate.de/translate", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: detectedLang,
            target: targetLang
          })
        });
        const data = await translateRes.json();

        // 3. Speak in correct audio channel
        speakToEar(data.translatedText, detectedLang);
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error", e);
        setListening(false);
      };
    } else {
      recognition.stop();
      setListening(false);
    }
  };

  const speakToEar = (text, lang) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "it" ? "it-IT" : "en-US";

    const synth = window.speechSynthesis;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioCtx;

    const dest = audioCtx.createMediaStreamDestination();
    const merger = audioCtx.createChannelMerger(2);

    const source = audioCtx.createMediaStreamSource(dest.stream);
    source.connect(merger, 0, lang === "it" ? 1 : 0); // ITA: destra (1), ENG: sinistra (0)
    merger.connect(audioCtx.destination);

    const newUtter = new SpeechSynthesisUtterance(text);
    newUtter.lang = utterance.lang;

    const synthStream = dest.stream;
    const audio = new Audio();
    audio.srcObject = synthStream;
    audio.play();

    synth.speak(newUtter);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-4">Traduttore Vocale a Cuffie</h1>
      <Button variant="contained" onClick={handleListen}>
        {listening ? "Ferma" : "Ascolta"}
      </Button>
      <Card className="mt-4">
        <CardContent>
          <p><strong>Testo rilevato:</strong> {transcript}</p>
          <p><strong>Lingua:</strong> {lang}</p>
        </CardContent>
      </Card>
    </div>
  );
}
