// Кафе «Ковчег» — мобильное меню и проверка формы брони (демо, без отправки на сервер)
(function () {
  "use strict";

  // Мобильное меню: кнопка-бургер переключает навигацию
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });
    // Закрытие меню по клику на ссылку
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Открыть меню");
      }
    });
    // Закрытие меню по Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Открыть меню");
        burger.focus();
      }
    });
  }

  var form = document.getElementById("bron-form");
  if (!form) return;

  var nameInput = document.getElementById("f-name");
  var phoneInput = document.getElementById("f-phone");
  var dateInput = document.getElementById("f-date");
  var timeInput = document.getElementById("f-time");

  var errName = document.getElementById("err-name");
  var errPhone = document.getElementById("err-phone");
  var errDate = document.getElementById("err-date");
  var errTime = document.getElementById("err-time");
  var success = document.getElementById("form-success");

  // Минимальная дата: сегодня
  var today = new Date();
  var iso = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");
  dateInput.min = iso;

  function setError(input, errEl, show) {
    errEl.hidden = !show;
    input.classList.toggle("invalid", show);
    input.setAttribute("aria-invalid", show ? "true" : "false");
  }

  function validName() {
    return nameInput.value.trim().length >= 2;
  }

  function validPhone() {
    // 10-15 цифр: +7, 8, короткие внутренние форматы
    var digits = phoneInput.value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }

  function validDate() {
    if (!dateInput.value) return false;
    return dateInput.value >= iso;
  }

  function validTime() {
    if (!timeInput.value) return false;
    return timeInput.value >= "08:00" && timeInput.value <= "22:30";
  }

  function checkAll(showErrors) {
    var checks = [
      [nameInput, errName, validName()],
      [phoneInput, errPhone, validPhone()],
      [dateInput, errDate, validDate()],
      [timeInput, errTime, validTime()]
    ];
    var ok = true;
    for (var i = 0; i < checks.length; i++) {
      if (!checks[i][2]) ok = false;
      if (showErrors) setError(checks[i][0], checks[i][1], !checks[i][2]);
    }
    return ok;
  }

  // Живая проверка: снятие ошибки, когда поле исправили
  nameInput.addEventListener("input", function () { if (validName()) setError(nameInput, errName, false); });
  phoneInput.addEventListener("input", function () { if (validPhone()) setError(phoneInput, errPhone, false); });
  dateInput.addEventListener("change", function () { if (validDate()) setError(dateInput, errDate, false); });
  timeInput.addEventListener("change", function () { if (validTime()) setError(timeInput, errTime, false); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    success.hidden = true;
    if (checkAll(true)) {
      success.hidden = false;
      form.reset();
      dateInput.min = iso;
    } else {
      var firstInvalid = form.querySelector(".invalid");
      if (firstInvalid) firstInvalid.focus();
    }
  });
})();
