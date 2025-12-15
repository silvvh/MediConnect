'use client';

import { useParticipantIds, useVideoTrack, useAudioTrack, useParticipant } from '@daily-co/daily-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useRef, useEffect } from 'react';

export default function ParticipantsView() {
  const participantIds = useParticipantIds();

  // Layout: Grid for 2 participants, adjust for more
  const gridCols = participantIds.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <div className={`grid ${gridCols} gap-4 h-full`}>
      {participantIds.map((participantId) => (
        <ParticipantTile key={participantId} participantId={participantId} />
      ))}
    </div>
  );
}

function ParticipantTile({ participantId }: { participantId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoState = useVideoTrack(participantId);
  const audioState = useAudioTrack(participantId);
  const participant = useParticipant(participantId);

  useEffect(() => {
    if (videoRef.current && videoState.track) {
      videoRef.current.srcObject = new MediaStream([videoState.track]);
    }
  }, [videoState.track]);

  const isLocal = videoState.isLocal;
  const isCameraOn = videoState.isOff === false;
  const isMicOn = audioState.isOff === false;

  return (
    <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
      {/* Video */}
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <Avatar className="w-32 h-32 border-4 border-gray-700">
            <AvatarImage src={participant?.user_name || undefined} />
            <AvatarFallback className="bg-primary-500 text-white text-4xl">
              {participant?.user_name?.charAt(0) || participant?.session_id?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              {participant?.user_name || 'Participante'}
            </span>
            {isLocal && (
              <Badge variant="secondary" className="bg-white/20 text-white">
                Você
              </Badge>
            )}
          </div>

          {/* Status Icons */}
          <div className="flex items-center gap-2">
            {!isMicOn && (
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
            {!isCameraOn && (
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <VideoOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speaking Indicator */}
      {isMicOn && audioState.isActive && (
        <div className="absolute top-4 left-4">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

