import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import {
  quizOptionClasses,
  quizOptionLetterClasses,
  type QuizOptionState,
} from "@/components/course/quiz-option-styles";

type QuizOptionRowProps = {
  letter: string;
  state: QuizOptionState;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

/**
 * One answer option row sharing the exact visual recipe of the real quiz
 * player (`quiz-option-styles.ts`), plus landing-only correct/wrong marks.
 */
export function QuizOptionRow({ letter, state, children, onClick, disabled }: QuizOptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state !== "idle"}
      className={quizOptionClasses(state)}
    >
      <span className={quizOptionLetterClasses(state)}>{letter}</span>
      <span className="flex-1 leading-normal text-foreground">{children}</span>
      {state === "correct" ? (
        <Check className="size-4 shrink-0 text-status-success" aria-hidden />
      ) : state === "wrong" ? (
        <X className="size-4 shrink-0 text-status-error" aria-hidden />
      ) : null}
    </button>
  );
}
