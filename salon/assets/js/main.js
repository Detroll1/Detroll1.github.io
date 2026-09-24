// Лаванда — демо-лендинг. Мобильное меню и проверка формы записи.

(function () {
  "use strict";

  // ---------- Мобильное меню ----------

  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  function closeMenu() {
    if (!burger || !nav) {
      return;
    }
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Открыть меню");
    nav.classList.remove("nav--open");
    document.body.classList.remove("menu-open");
  }

  function toggleMenu() {
    if (!burger || !nav) {
      return;
    }
    var isOpen = burger.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
    } else {
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Закрыть меню");
      nav.classList.add("nav--open");
      document.body.classList.add("menu-open");
    }
  }

  if (burger && nav) {
    burger.addEventListener("click", toggleMenu);

    // Клик по ссылке в меню закрывает его.
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        closeMenu();
      }
    });

    // Escape закрывает меню.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    // Клик мимо меню закрывает его.
    document.addEventListener("click", function (event) {
      var isOpen = burger.getAttribute("aria-expanded") === "true";
      if (!isOpen) {
        return;
      }
      if (!event.target.closest(".nav") && !event.target.closest(".burger")) {
        closeMenu();
      }
    });
  }

  // ---------- Форма записи ----------

  var form = document.getElementById("booking-form");
  var status = document.getElementById("form-status");

  function setError(input, errorEl, hasError) {
    if (hasError) {
      input.classList.add("field__input--invalid");
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
    } else {
      input.classList.remove("field__input--invalid");
      errorEl.hidden = true;
      input.removeAttribute("aria-invalid");
    }
  }

  function digitsOnly(value) {
    return value.replace(/\D/g, "");
  }

  function validateName(input, errorEl) {
    var ok = input.value.trim().length >= 2;
    setError(input, errorEl, !ok);
    return ok;
  }

  function validatePhone(input, errorEl) {
    var digits = digitsOnly(input.value);
    var ok = digits.length === 11 && (digits[0] === "7" || digits[0] === "8");
    setError(input, errorEl, !ok);
    return ok;
  }

  function validateService(input, errorEl) {
    var ok = input.value !== "";
    setError(input, errorEl, !ok);
    return ok;
  }

  function validateDate(input, errorEl) {
    if (input.value === "") {
      setError(input, errorEl, true);
      return false;
    }
    var chosen = new Date(input.value + "T00:00:00");
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var ok = !isNaN(chosen.getTime()) && chosen.getTime() >= today.getTime();
    setError(input, errorEl, !ok);
    return ok;
  }

  function validateTime(input, errorEl) {
    var ok = input.value !== "";
    setError(input, errorEl, !ok);
    return ok;
  }

  if (form) {
    var nameInput = document.getElementById("f-name");
    var phoneInput = document.getElementById("f-phone");
    var serviceInput = document.getElementById("f-service");
    var dateInput = document.getElementById("f-date");
    var timeInput = document.getElementById("f-time");

    var errName = document.getElementById("err-name");
    var errPhone = document.getElementById("err-phone");
    var errService = document.getElementById("err-service");
    var errDate = document.getElementById("err-date");
    var errTime = document.getElementById("err-time");

    // Минимальная дата: сегодня.
    var todayISO = new Date().toISOString().slice(0, 10);
    dateInput.min = todayISO;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var checks = [
        validateName(nameInput, errName),
        validatePhone(phoneInput, errPhone),
        validateService(serviceInput, errService),
        validateDate(dateInput, errDate),
        validateTime(timeInput, errTime)
      ];

      var allOk = checks.every(Boolean);

      if (!allOk) {
        status.classList.remove("form__status--ok");
        status.textContent = "Проверьте поля, выделенные красным.";
        var firstInvalid = form.querySelector(".field__input--invalid");
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      status.classList.add("form__status--ok");
      status.textContent =
        "Заявка принята. Администратор перезвонит по номеру " +
        phoneInput.value.trim() +
        " и подтвердит время.";
      form.reset();
      dateInput.min = todayISO;
    });

    // Ошибка снимается, как только поле начинают исправлять.
    nameInput.addEventListener("input", function () {
      validateName(nameInput, errName);
    });
    phoneInput.addEventListener("input", function () {
      validatePhone(phoneInput, errPhone);
    });
    serviceInput.addEventListener("change", function () {
      validateService(serviceInput, errService);
    });
    dateInput.addEventListener("change", function () {
      validateDate(dateInput, errDate);
    });
    timeInput.addEventListener("change", function () {
      validateTime(timeInput, errTime);
    });
  }
})();
