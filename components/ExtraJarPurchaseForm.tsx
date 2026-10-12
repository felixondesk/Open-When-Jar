import { startExtraJarCheckoutAction } from "@/app/app/unlock/actions";

export function ExtraJarPurchaseForm() {
  return (
    <form action={startExtraJarCheckoutAction}>
      <label className="pricing-market" htmlFor="extra-jar-currency">
        Checkout currency
        <select defaultValue="global" id="extra-jar-currency" name="currency">
          <option value="global">USD · $1.99</option>
          <option value="india">INR · ₹59</option>
        </select>
      </label>
      <button className="button button--primary" type="submit">Buy one extra Jar</button>
      <p className="account-card__note">Test mode only. No real payment is collected.</p>
    </form>
  );
}
