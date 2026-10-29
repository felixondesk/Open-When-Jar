import { startExtraJarCheckoutAction } from "@/app/app/unlock/actions";
import type { PricingMarket } from "@/lib/plans";

export function ExtraJarPurchaseForm({ defaultMarket, liveMode }: { defaultMarket: PricingMarket; liveMode: boolean }) {
  return (
    <form action={startExtraJarCheckoutAction}>
      <label className="pricing-market" htmlFor="extra-jar-currency">
        Checkout currency
        <select defaultValue={defaultMarket} id="extra-jar-currency" name="currency">
          <option value="global">USD · $1.99</option>
          <option value="india">INR · ₹59</option>
        </select>
      </label>
      <button className="button button--primary" type="submit">Buy one extra Jar</button>
      <p className="account-card__note">{liveMode ? "Payment is handled securely by Dodo Payments." : "Test mode only. No real payment is collected."}</p>
    </form>
  );
}
