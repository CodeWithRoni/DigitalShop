import { requireOwner } from '@/lib/admin';
import { emailConfigured, getSettings, telegramConfigured } from '@/lib/settings';
import { saveStoreSettings, sendTestNotification } from '../../feature-actions';
import { Flash, FormSwitch, Label, PageHeader, Panel } from '@/components/admin/ui';
import Icon from '@/components/admin/Icon';

export default async function SettingsPage(props: { searchParams: Promise<{ saved?: string; error?: string; tested?: string }> }) {
  await requireOwner();
  const sp = await props.searchParams;
  const s = await getSettings();
  const tg = telegramConfigured(); const em = emailConfigured();

  return (
    <div className="max-w-4xl">
      <PageHeader title="Store settings" subtitle="Change your shop without touching code or Vercel." />
      <Flash ok={sp.saved ? 'Settings saved — the store is updated.' : sp.tested ? `Test ${sp.tested === 'email' ? 'email' : 'Telegram message'} sent. Check it!` : null} error={sp.error} />

      <form action={saveStoreSettings} className="space-y-6">
        <Panel title={<span className="flex items-center gap-2"><Icon name="store" size={16} />Shop</span>}>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div><Label>Shop name</Label><input name="shop_name" defaultValue={s.shop_name} className="input" maxLength={60} /></div>
            <div><Label hint="(with 880, no +)">WhatsApp number</Label><input name="whatsapp" defaultValue={s.whatsapp} className="input" placeholder="8801XXXXXXXXX" inputMode="tel" /></div>
            <div className="sm:col-span-2"><Label hint="(optional, shown in footer)">Support email</Label><input name="support_email" type="email" defaultValue={s.support_email} className="input" /></div>
          </div>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Icon name="bell" size={16} />Announcement bar</span>}>
          <div className="space-y-4 p-5">
            <FormSwitch name="notice_active" defaultChecked={s.notice_active} label="Show a notice at the top of the store" desc="e.g. Eid offer, holiday delivery times" />
            <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
              <div><Label>Notice text</Label><input name="notice_text" defaultValue={s.notice_text} className="input" maxLength={200} placeholder="🎉 Eid offer — use code EID20 for 20% off!" /></div>
              <div><Label hint="(optional)">Link</Label><input name="notice_link" defaultValue={s.notice_link} className="input" placeholder="/product/netflix" /></div>
            </div>
          </div>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Icon name="shield" size={16} />Shop open / closed</span>}>
          <div className="space-y-4 p-5">
            <FormSwitch name="shop_open" defaultChecked={s.shop_open} label="Accept new orders" desc="Turn off during holidays — customers can browse but not check out." />
            <div><Label>Message when closed</Label><input name="closed_message" defaultValue={s.closed_message} className="input" maxLength={300} /></div>
          </div>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Icon name="bell" size={16} />Order notifications</span>}>
          <div className="space-y-5 p-5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-medium">Telegram</div>
                <span className={`badge ${tg ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>{tg ? 'Bot token set' : 'Bot token missing'}</span>
              </div>
              <Label hint="(your user or group ID)">Telegram chat ID</Label>
              <input name="telegram_chat_id" defaultValue={s.telegram_chat_id} className="input font-mono" placeholder="123456789" />
              {!tg && <p className="mt-2 text-xs text-zinc-500">Add <code className="text-zinc-300">TELEGRAM_BOT_TOKEN</code> in Vercel → Settings → Environment Variables, then redeploy.</p>}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-medium">Email</div>
                <span className={`badge ${em ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-zinc-500/30 bg-white/5 text-zinc-400'}`}>{em ? 'Resend key set' : 'Optional — Resend key missing'}</span>
              </div>
              <Label hint="(where new-order emails go)">Your email</Label>
              <input name="notify_email" type="email" defaultValue={s.notify_email} className="input" />
              <p className="mt-2 text-xs text-zinc-500">Customers also get a “your order is delivered” email when they gave an email. Needs <code className="text-zinc-300">RESEND_API_KEY</code> in Vercel.</p>
            </div>
            <FormSwitch name="notify_unpaid" defaultChecked={s.notify_unpaid} label="Also notify for unpaid orders" desc="By default you only get a message after payment succeeds." />
            <div className="sm:w-60"><Label>Low-stock alert when keys left ≤</Label><input name="low_stock_threshold" type="number" min={0} defaultValue={s.low_stock_threshold} className="input" /></div>
          </div>
        </Panel>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <button className="btn-primary !px-6 !py-3 shadow-2xl"><Icon name="check" size={16} />Save settings</button>
        </div>
      </form>

      <Panel title="Test notifications" className="mt-6">
        <div className="flex flex-wrap gap-3 p-5">
          <form action={sendTestNotification}><input type="hidden" name="kind" value="telegram" />
            <button className="btn-ghost" disabled={!tg}>Send test Telegram</button></form>
          <form action={sendTestNotification} className="flex gap-2"><input type="hidden" name="kind" value="email" />
            <input name="to" type="email" defaultValue={s.notify_email} placeholder="you@email.com" className="input !w-56" />
            <button className="btn-ghost" disabled={!em}>Send test email</button></form>
        </div>
        <p className="px-5 pb-5 text-xs text-zinc-500">Save your chat ID first, then send a test.</p>
      </Panel>
    </div>
  );
}
