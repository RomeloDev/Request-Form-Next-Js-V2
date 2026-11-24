import {
  Banknote,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  CircleHelp,
  CircleUserRound,
  CircleX,
  ClipboardCheck,
  Clock3,
  ContactRound,
  Eye,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Loader,
  LockKeyhole,
  LogOut,
  MapPin,
  Menu,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UsersRound,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/** Stable application names mapped to tree-shakeable Lucide components. */
const icons = {
  dashboard: LayoutDashboard,
  users: Users,
  briefcase: BriefcaseBusiness,
  building: Building2,
  userCheck: UserCheck,
  team: UsersRound,
  location: MapPin,
  contact: ContactRound,
  feedback: MessageSquareText,
  lock: LockKeyhole,
  chart: ChartNoAxesColumnIncreasing,
  help: CircleHelp,
  file: FileText,
  filePlus: FilePlus2,
  clipboard: ClipboardCheck,
  share: Share2,
  logout: LogOut,
  profile: CircleUserRound,
  settings: Settings,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  firstPage: ChevronFirst,
  lastPage: ChevronLast,
  refresh: RefreshCw,
  eye: Eye,
  pencil: Pencil,
  trash: Trash2,
  shieldCheck: ShieldCheck,
  clock: Clock3,
  checkCircle: CircleCheck,
  xCircle: CircleX,
  progress: Loader,
  plus: Plus,
  menu: Menu,
  close: X,
  bell: Bell,
  banknote: Banknote,
  dollar: CircleDollarSign,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

type IconProps = LucideProps & { name: IconName };

/** Decorative application icon. The surrounding control owns its label. */
export default function Icon({
  name,
  className = "size-5",
  ...props
}: IconProps) {
  const LucideIcon = icons[name];

  return (
    <LucideIcon
      {...props}
      aria-hidden="true"
      focusable="false"
      strokeWidth={1.75}
      className={`shrink-0 ${className}`}
    />
  );
}
