/* =========================================================
   QUIANNA THOMAS
   SUPABASE CONNECTION
   ========================================================= */

const SUPABASE_URL =
  "https://jvbuzplidgnebqxcucam.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_ZzsHLYrq9Om_ue8UDLedYA_IMrpT2uF";

/*
  Supabase browser library.
  We load it dynamically so you don't need another local file.
*/

const supabaseScript = document.createElement("script");

supabaseScript.src =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

document.head.appendChild(supabaseScript);

supabaseScript.onload = initializeSupabase;

let supabaseClient = null;


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeSupabase() {

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  startPage();

}


/* =========================================================
   PAGE DETECTION
   ========================================================= */

function startPage() {

  if (document.getElementById("loginForm")) {
    setupLogin();
  }

  if (document.getElementById("bookingForm")) {
    setupBookingForm();
  }

  if (document.getElementById("bookingList")) {
    setupDashboard();
  }

}


/* =========================================================
   LOGIN
   ========================================================= */

function setupLogin() {

  const form =
    document.getElementById("loginForm");

  const button =
    document.getElementById("loginButton");

  const error =
    document.getElementById("loginError");

  form.addEventListener("submit", async function(event) {

    event.preventDefault();

    error.hidden = true;

    button.disabled = true;
    button.textContent = "Signing In...";

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value;

    const { data, error: loginError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) {

      error.textContent =
        loginError.message ||
        "Unable to sign in.";

      error.hidden = false;

      button.disabled = false;
      button.textContent = "Sign In";

      return;
    }

    if (data.session) {

      window.location.href =
        "dashboard.html";

    }

  });

}


/* =========================================================
   CHECK LOGIN
   ========================================================= */

async function requireOwner() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {

    window.location.href =
      "login.html";

    return null;

  }

  return session;

}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function setupDashboard() {

  const session =
    await requireOwner();

  if (!session) return;

  await loadBookings();

  const logout =
    document.getElementById("logoutBtn");

  if (logout) {

    logout.addEventListener(
      "click",
      async function() {

        await supabaseClient.auth.signOut();

        window.location.href =
          "login.html";

      }
    );

  }

  const refresh =
    document.getElementById("refreshBtn");

  if (refresh) {

    refresh.addEventListener(
      "click",
      loadBookings
    );

  }

}


/* =========================================================
   LOAD BOOKINGS
   ========================================================= */

async function loadBookings() {

  const list =
    document.getElementById("bookingList");

  list.innerHTML =
    '<div class="empty">Loading bookings...</div>';

  const {
    data: bookings,
    error
  } =
    await supabaseClient
      .from("bookings")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    list.innerHTML =
      `<div class="empty">
        Unable to load bookings:
        ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  updateCounts(bookings || []);

  if (!bookings || bookings.length === 0) {

    list.innerHTML =
      '<div class="empty">No booking requests yet.</div>';

    return;

  }

  list.innerHTML = "";

  bookings.forEach(function(booking) {

    const item =
      document.createElement("article");

    item.className =
      "booking";

    item.innerHTML = `

      <div>

        <h3>
          ${escapeHTML(booking.customer_name)}
        </h3>

        <div class="meta">

          <strong>
            ${escapeHTML(booking.service)}
          </strong>

          <br>

          ${escapeHTML(
            formatDate(booking.appointment_date)
          )}

          at

          ${escapeHTML(
            formatTime(booking.appointment_time)
          )}

          <br>

          ${escapeHTML(booking.phone)}

          ${
            booking.email
              ? " · " + escapeHTML(booking.email)
              : ""
          }

          ${
            booking.notes
              ? "<br><strong>Notes:</strong> " +
                escapeHTML(booking.notes)
              : ""
          }

        </div>

      </div>

      <div>

        <span class="badge ${booking.status}">
          ${escapeHTML(booking.status)}
        </span>

        ${
          booking.status === "pending"
            ? `
              <div class="actions">

                <button
                  class="action accept"
                  data-id="${booking.id}"
                  data-status="accepted">
                  Accept
                </button>

                <button
                  class="action decline"
                  data-id="${booking.id}"
                  data-status="declined">
                  Decline
                </button>

              </div>
            `
            : ""
        }

      </div>

    `;

    list.appendChild(item);

  });

  document
    .querySelectorAll("[data-status]")
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          updateBookingStatus(
            button.dataset.id,
            button.dataset.status
          );

        }
      );

    });

}


/* =========================================================
   COUNTERS
   ========================================================= */

function updateCounts(bookings) {

  const pending =
    bookings.filter(
      b => b.status === "pending"
    ).length;

  const accepted =
    bookings.filter(
      b => b.status === "accepted"
    ).length;

  const declined =
    bookings.filter(
      b => b.status === "declined"
    ).length;

  document.getElementById(
    "pendingCount"
  ).textContent = pending;

  document.getElementById(
    "acceptedCount"
  ).textContent = accepted;

  document.getElementById(
    "declinedCount"
  ).textContent = declined;

}


/* =========================================================
   ACCEPT / DECLINE BOOKING
   ========================================================= */

async function updateBookingStatus(
  bookingId,
  status
) {

  const {
    error
  } =
    await supabaseClient
      .from("bookings")
      .update({
        status: status
      })
      .eq("id", bookingId);

  if (error) {

    alert(
      "Unable to update booking: " +
      error.message
    );

    return;

  }

  await loadBookings();

}


/* =========================================================
   PUBLIC BOOKING FORM
   ========================================================= */

function setupBookingForm() {

  const form =
    document.getElementById("bookingForm");

  const button =
    document.getElementById("bookingButton");

  const success =
    document.getElementById("bookingSuccess");

  const errorBox =
    document.getElementById("bookingError");

  form.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();

      success.hidden = true;
      errorBox.hidden = true;

      button.disabled = true;
      button.textContent =
        "Sending Request...";

      const formData =
        new FormData(form);

      const booking = {

        customer_name:
          formData.get("customer_name").trim(),

        phone:
          formData.get("phone").trim(),

        email:
          formData.get("email").trim() || null,

        service:
          formData.get("service"),

        appointment_date:
          formData.get("appointment_date"),

        appointment_time:
          formData.get("appointment_time"),

        notes:
          formData.get("notes").trim() || null

      };

      const {
        error
      } =
        await supabaseClient
          .from("bookings")
          .insert([booking]);

      if (error) {

        errorBox.textContent =
          "We couldn't submit your request. " +
          error.message;

        errorBox.hidden = false;

        button.disabled = false;
        button.textContent =
          "Send Booking Request";

        return;

      }

      form.reset();

      success.hidden = false;

      button.disabled = false;
      button.textContent =
        "Send Booking Request";

    }
  );

}


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {

  if (value === null ||
      value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function formatDate(dateString) {

  if (!dateString) return "";

  const date =
    new Date(dateString + "T00:00:00");

  return date.toLocaleDateString(
    "en-US",
    {
      weekday:"short",
      month:"short",
      day:"numeric",
      year:"numeric"
    }
  );

}


function formatTime(timeString) {

  if (!timeString) return "";

  const parts =
    timeString.split(":");

  const date =
    new Date();

  date.setHours(
    Number(parts[0]),
    Number(parts[1]),
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-US",
    {
      hour:"numeric",
      minute:"2-digit"
    }
  );

    }
