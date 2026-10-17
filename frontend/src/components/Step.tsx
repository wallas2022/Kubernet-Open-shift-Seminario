type StepProps = { number: string; title: string; children: React.ReactNode };

export function Step({ number, title, children }: StepProps) {
  return <li className="step">
    <span className="step-number" aria-hidden="true">{number}</span>
    <div><h3>{title}</h3><p>{children}</p></div>
  </li>;
}
