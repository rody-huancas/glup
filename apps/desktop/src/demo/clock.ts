// The pictures never depend on when they are taken: the demo's clock says today at 16:30 (the greeting is
// «¡Buenas tardes, Ana!»), and the sample history is told from that moment. Imported first.
const FIXED_HOUR   = 16;
const FIXED_MINUTE = 30;

const RealDate = Date;
const fixed    = new RealDate();
fixed.setHours(FIXED_HOUR, FIXED_MINUTE, 0, 0);
const offset   = fixed.getTime() - RealDate.now();

class DemoDate extends RealDate {
  constructor(...args: ConstructorParameters<typeof Date> | []) {
    if (args.length === 0) super(RealDate.now() + offset);
    else super(...(args as ConstructorParameters<typeof Date>));
  }

  static override now(): number {
    return RealDate.now() + offset;
  }
}

globalThis.Date = DemoDate as DateConstructor;
