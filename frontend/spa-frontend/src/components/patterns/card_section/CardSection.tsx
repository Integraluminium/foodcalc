import type {ReactNode} from "react";
import styles from './CardSection.module.css';

export interface CardSectionProps {
  title: ReactNode;
  children: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function CardSection({ title, children, action }: CardSectionProps) {
  return (
    <section className={`card ${styles.section}`}>
      <h2 className="section-subtitle">{title}</h2>
      {children}
      {action && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </section>
  );
}