import { buttonVariants } from '@affine/admin/components/ui/button';
import { Separator } from '@affine/admin/components/ui/separator';
import { cn } from '@affine/admin/utils';
import {
  AlbumIcon,
  ChevronRightIcon,
  GithubIcon,
  MailWarningIcon,
  UploadCloudIcon,
} from 'lucide-react';
import { z } from 'zod';

const appChannelSchema = z.enum(['stable', 'canary', 'beta', 'internal']);

type Channel = z.infer<typeof appChannelSchema>;

const appNames = {
  stable: 'Solomon AI Workspace',
  canary: 'Solomon AI Workspace Canary',
  beta: 'Solomon AI Workspace Beta',
  internal: 'Solomon AI Workspace Internal',
} satisfies Record<Channel, string>;
const appName = appNames[BUILD_CONFIG.appBuildType];

const links = [
  {
    href: BUILD_CONFIG.githubUrl,
    icon: <GithubIcon size={20} />,
    label: 'Star Solomon AI Workspace on GitHub',
  },
  {
    href: BUILD_CONFIG.githubUrl,
    icon: <MailWarningIcon size={20} />,
    label: 'Report an Issue',
  },
  {
    href: 'https://docs.affine.pro/docs/self-host-affine',
    icon: <AlbumIcon size={20} />,
    label: 'Self-host Document',
  },
  {
    href: 'https://affine.pro/pricing',
    icon: <UploadCloudIcon size={20} />,
    label: 'Upgrade to Pro',
  },
];

export function AboutAFFiNE() {
  return (
    <div className="flex flex-col w-full h-full gap-3 px-6 py-5">
      <div className="flex items-center">
        <span className="text-xl font-semibold">About Solomon AI Workspace</span>
      </div>
      <div className="overflow-y-auto space-y-[10px]">
        <div className="flex flex-col border rounded-md">
          {links.map(({ href, icon, label }, index) => (
            <div key={label + index}>
              <a
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'justify-between cursor-pointer w-full'
                )}
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                <div className="flex items-center gap-3">
                  {icon}
                  <span>{label}</span>
                </div>
                <div>
                  <ChevronRightIcon size={20} />
                </div>
              </a>
              {index < links.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 text-sm font-normal text-gray-500">
        <div>{`App Version: ${appName} ${BUILD_CONFIG.appVersion}`}</div>
        <div>{`Editor Version: ${BUILD_CONFIG.editorVersion}`}</div>
      </div>
    </div>
  );
}
