import React, { useState } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = "auto";

export default function RealtimeTranslator() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lang, setLang] = useState(null);

  const handleListen = () => {
    if (!listening) {
      setTranscript("");
      recognition.start();
      setListening(true);

      recognition.onresult = async (event) => {
        const text = event.results[event.resultIndex][0].transcript.trim();
        setTranscript((prev) => prev + " " + text);

        if (text.length < 3) return;

        // 1. Detect language
        const detectedLangRes = await fetch("https://libretranslate.de/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text }),
        });
        const detected = await detectedLangRes.json();
        const detectedLang = detected[0].language;
        setLang(detectedLang);

        // 2. Translate to the other language
        const targetLang = detectedLang === "it" ? "en" : "it";
        const translateRes = await fetch("https://libretranslate.de/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: detectedLang,
            target: targetLang,
          }),
        });
        const data = await translateRes.json();
        const translatedText = data.translatedText;

        // 3. Get audio from VoiceRSS and play in one ear
        fetchAudioAndPlay(translatedText, targetLang);
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

  const fetchAudioAndPlay = async (text, lang) => {
    const apiKey = "d83a14ccb4a44e62b9c90e364670b04c";
    const voiceLang = lang === "it" ? "it-it" : "en-us";

    const url = `https://api.voicerss.org/?key=${apiKey}&hl=${voiceLang}&src=${encodeURIComponent(
      text
    )}&c=MP3&f=44khz_16bit_stereo`;

    try {
      const response = await fetch(url);
      const audioData = await response.arrayBuffer();

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = await audioCtx.decodeAudioData(audioData);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      const merger = audioCtx.createChannelMerger(2);
      const zeroGain = audioCtx.createGain();
      zeroGain.gain.value = 0;

      const mainGain = audioCtx.createGain();
      mainGain.gain.value = 1;

      // IT = destra (1), EN = sinistra (0)
      if (lang === "it") {
        source.connect(zeroGain).connect(merger, 0, 0); // mute left
        source.connect(mainGain).connect(merger, 0, 1); // right
      } else {
        source.connect(mainGain).connect(merger, 0, 0); // left
        source.connect(zeroGain).connect(merger, 0, 1); // mute right
      }

      merger.connect(audioCtx.destination);
      source.start();
    } catch (error) {
      console.error("Audio playback error:", error);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-4">Traduttore Vocale a Cuffie</h1>
      <Button variant="contained" onClick={handleListen}>
        {listening ? "Ferma" : "Ascolta"}
      </Button>
      <Card className="mt-4">
        <CardContent>
          <p>
            <strong>Testo rilevato:</strong> {transcript}
          </p>
          <p>
            <strong>Lingua:</strong> {lang}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
