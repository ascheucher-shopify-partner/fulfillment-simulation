import crypto from "node:crypto";

type BaseEventAttributes = {
  appointmentId: string;
  cancellationReason: string;
  cancellationNotes?: string;
  prescriptionId: string;
  requestId: string;
  requestedAt: string;
  updatedAt: string;
};

type FoundationHealthWebhookEnvelope<TEvent extends string, TAttributes> = {
  event: {
    id: string;
    type: TEvent;
    attributes: TAttributes;
  };
  meta: {
    sentAt: string;
    source: string;
    version: string;
  };
};

export type PrescriptionRequestAppointmentCancelledEnvelope =
  FoundationHealthWebhookEnvelope<
    "prescription_request_appointment_cancelled",
    BaseEventAttributes
  >;

const defaultEnvelope: PrescriptionRequestAppointmentCancelledEnvelope = {
  event: {
    id: "evt_prescription_request_appointment_cancelled_example",
    type: "prescription_request_appointment_cancelled",
    attributes: {
      appointmentId: "appt_example_12345",
      cancellationReason: "patient_cancelled",
      cancellationNotes: "Patient unavailable, asked to reschedule",
      prescriptionId: "rx_example_67890",
      requestId: "req_example_54321",
      requestedAt: new Date("2025-02-14T08:35:00.000Z").toISOString(),
      updatedAt: new Date("2025-02-14T08:47:00.000Z").toISOString(),
    },
  },
  meta: {
    sentAt: new Date("2025-02-14T08:47:05.000Z").toISOString(),
    source: "foundation_health",
    version: "2025-02-13",
  },
};

type BuildEnvelopeOverrides = {
  id?: string;
  attributes?: Partial<BaseEventAttributes>;
  meta?: Partial<PrescriptionRequestAppointmentCancelledEnvelope["meta"]>;
};

export function buildPrescriptionRequestAppointmentCancelledEnvelope(
  overrides: BuildEnvelopeOverrides = {},
): PrescriptionRequestAppointmentCancelledEnvelope {
  const { id, attributes, meta } = overrides;

  return {
    event: {
      id: id ?? defaultEnvelope.event.id,
      type: "prescription_request_appointment_cancelled",
      attributes: {
        ...defaultEnvelope.event.attributes,
        ...attributes,
      },
    },
    meta: {
      ...defaultEnvelope.meta,
      ...meta,
    },
  };
}

export function wrapFoundationHealthJwt(
  envelope: PrescriptionRequestAppointmentCancelledEnvelope,
  secret = process.env.FH_TEST_SHARED_SECRET ?? "replace-with-test-secret",
): string {
  if (!secret) {
    throw new Error("Foundation Health test secret is missing");
  }

  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JOSE" }),
  ).toString("base64url");

  const payload = Buffer.from(JSON.stringify(envelope)).toString("base64url");

  const body = `${header}.${payload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function createPrescriptionRequestAppointmentCancelledJwt(
  overrides: BuildEnvelopeOverrides = {},
  secret?: string,
): string {
  const envelope = buildPrescriptionRequestAppointmentCancelledEnvelope(overrides);
  return wrapFoundationHealthJwt(envelope, secret);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jwt = createPrescriptionRequestAppointmentCancelledJwt();
  // eslint-disable-next-line no-console
  console.log(jwt);
}
