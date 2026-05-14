
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface AIOrbProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  onClick: () => void;
}

export function AIOrb({ isListening, isProcessing, isSpeaking, onClick }: AIOrbProps) {
  return (
    <div className="relative flex items-center justify-center cursor-pointer" onClick={onClick} id="ai-orb-container">
      {/* Wave Rings */}
      <AnimatePresence>
        {(isListening || isSpeaking || isProcessing) && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.3, 0.1],
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                ease: "easeInOut" 
              }}
              className="absolute w-48 h-48 rounded-full bg-cyan-500/20 blur-xl"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 1.8, 1],
                opacity: [0.05, 0.15, 0.05],
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                repeat: Infinity, 
                duration: 3, 
                ease: "easeInOut",
                delay: 0.5 
              }}
              className="absolute w-64 h-64 rounded-full bg-blue-500/10 blur-2xl"
            />
          </>
        )}
      </AnimatePresence>

      {/* Main Orb */}
      <motion.div
        animate={{
          scale: isListening ? 1.1 : isSpeaking ? 1.05 : 1,
          boxShadow: isProcessing 
            ? "0 0 40px 10px rgba(6, 182, 212, 0.5)" 
            : isListening 
            ? "0 0 30px 5px rgba(239, 68, 68, 0.4)" 
            : "0 0 20px 0px rgba(6, 182, 212, 0.2)",
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          "relative w-32 h-32 rounded-full flex items-center justify-center transition-colors duration-500",
          isProcessing ? "bg-cyan-600" : isListening ? "bg-red-500" : "bg-cyan-500"
        )}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/20 to-white/20 pointer-events-none" />
        
        {isListening ? (
          <Mic className="w-12 h-12 text-white animate-pulse" />
        ) : isProcessing ? (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ height: [8, 24, 8] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                className="w-1.5 bg-white rounded-full"
              />
            ))}
          </div>
        ) : (
          <Mic className="w-12 h-12 text-white" />
        )}
      </motion.div>

      {/* Status Text */}
      <div className="absolute -bottom-16 text-center">
        <p className={cn(
          "text-sm font-medium tracking-widest uppercase transition-colors",
          isListening ? "text-red-400" : "text-cyan-400"
        )}>
          {isListening ? "Listening..." : isProcessing ? "Thinking..." : isSpeaking ? "Speaking..." : "Tap to Speak"}
        </p>
      </div>
    </div>
  );
}
