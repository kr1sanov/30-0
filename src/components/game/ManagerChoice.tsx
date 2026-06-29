'use client';

import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';

export default function ManagerChoice() {
  const { simulate, setScreen } = useGameStore();

  const handleWithManager = () => {
    // For now, just simulate with a default manager bonus
    simulate(75);
  };

  const handleWithoutManager = () => {
    simulate();
  };

  return (
    <div className="rounded-xl bg-[#1a1a2e] p-6 space-y-4">
      <h3 className="text-lg font-bold text-[#e2e8f0] text-center">
        Играть с тренером?
      </h3>

      <p className="text-sm text-[#94a3b8] text-center">
        Тренер даёт +2 к общему рейтингу команды
      </p>

      <div className="space-y-3">
        <Button
          onClick={handleWithManager}
          className="w-full h-12 text-sm font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl"
        >
          С тренером (+2 к рейтингу)
        </Button>

        <Button
          onClick={handleWithoutManager}
          variant="outline"
          className="w-full h-12 text-sm font-medium border-[#94a3b8]/30 text-[#94a3b8] hover:bg-[#0a0a0f] rounded-xl"
        >
          Без тренера (классика)
        </Button>
      </div>
    </div>
  );
}
