import { NetworkAvailabilityNotice } from '@openzeppelin/ui-components';
import { isNetworkAvailabilityPolicyActive } from '@openzeppelin/ui-utils';

import { HOSTED_APP_NAME } from '@/constants/hosting';

const SELF_HOST_REPO_URL = 'https://github.com/OpenZeppelin/role-manager';

interface HostedNetworkNoticeProps {
  /** Page banner under the header (default) or compact inline notice in dialogs. */
  variant?: 'banner' | 'inline';
  className?: string;
}

/**
 * App-wide mainnet availability notice. The banner variant lives in the main
 * column so the sidebar stays focused on contract/network navigation.
 */
export function HostedNetworkNotice({
  variant = 'banner',
  className,
}: HostedNetworkNoticeProps): React.ReactElement | null {
  if (!isNetworkAvailabilityPolicyActive()) {
    return null;
  }

  const notice = (
    <NetworkAvailabilityNotice
      appName={HOSTED_APP_NAME}
      selfHostRepoUrl={SELF_HOST_REPO_URL}
      className={className}
    />
  );

  if (variant === 'inline') {
    return notice;
  }

  return (
    <div className="shrink-0 border-b border-border/60 bg-background px-4 py-3 md:px-6">
      {notice}
    </div>
  );
}
