import type { ReactNode } from "react";

export type VerbleNavProps = {
  subtitle?: string;
  subtitleHref?: string;
  subtitleAsHeading?: boolean;
  label?: string;
  labelId?: string;
  labelClassName?: string;
  homeHref?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  headerClassName?: string;
  innerClassName?: string;
};

export type VerbleMenuLink = {
  label: string;
  href: string;
  id?: string;
  hidden?: boolean;
  brand?: boolean;
  description?: string;
  iconSrc?: string;
  iconAlt?: string;
  iconBackground?: string;
  completed?: boolean;
  statusLabel?: string;
  statusTone?: "done" | "neutral" | string;
  archiveHref?: string;
};

export type VerbleMenuProgressSummary = {
  label?: string;
  completed?: number;
  total?: number;
  ariaLabel?: string;
  progressMessage?: string;
  completionTitle?: string;
  completionMessage?: string;
  completionCountdown?: string;
  completionActionLabel?: string;
  completionActionHref?: string;
};

export type VerbleUnavailableProps = {
  title?: string;
  message?: string;
  className?: string;
};

export type VerbleMenuProps = {
  items?: VerbleMenuLink[];
  legalLinks?: VerbleMenuLink[];
  progressSummary?: VerbleMenuProgressSummary | null;
  buttonId?: string;
  menuId?: string;
  buttonAriaLabel?: string;
  buttonText?: string;
};

export declare function VerbleNav(props: VerbleNavProps): ReactNode;
export declare function VerbleMenu(props: VerbleMenuProps): ReactNode;
export declare function VerbleUnavailable(props: VerbleUnavailableProps): ReactNode;
