"""
telegram_notifier.py — Notificari Telegram pentru evenimente din fluxul comenzilor.

Configurare necesara in .env:
    TELEGRAM_BOT_TOKEN=<token de la @BotFather>
    TELEGRAM_CHAT_ID=<chat_id sau group_id al adminului>
"""

import os
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"


def _send(text: str, chat_id: str = None) -> bool:
    """Trimite un mesaj text pe Telegram. Returneaza True daca reusit."""
    cid = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not cid:
        logger.warning("Telegram nu este configurat (TELEGRAM_BOT_TOKEN sau TELEGRAM_CHAT_ID lipseste).")
        return False
    try:
        resp = requests.post(
            BASE_URL,
            json={"chat_id": cid, "text": text, "parse_mode": "HTML"},
            timeout=5
        )
        if not resp.ok:
            logger.error(f"Telegram error: {resp.text}")
        return resp.ok
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
        return False


def _fmt_time(dt: datetime) -> str:
    if not dt:
        return "—"
    return dt.strftime("%d.%m.%Y %H:%M")


def notify_checkin(work_order, user, lat: float, lng: float, gps_match: bool) -> bool:
    """Trimis cand un muncitor/sofer face check-in la locatia comenzii."""
    gps_status = "GPS OK" if gps_match else "GPS DIVERGENT"
    if gps_match is None:
        gps_status = "GPS (locatie nesetata)"

    text = (
        f"<b>Sosire la lucrare</b>\n"
        f"Lucrare: {work_order.title}\n"
        f"Client: {work_order.client_name or '—'}\n"
        f"Adresa: {work_order.site_address or '—'}\n"
        f"Muncitor: {user.full_name}\n"
        f"Ora: {_fmt_time(datetime.utcnow())}\n"
        f"Status GPS: {gps_status}"
    )
    return _send(text)


def notify_checkout(work_order, user, worked_minutes: int) -> bool:
    """Trimis cand un muncitor face check-out."""
    hours = worked_minutes // 60
    mins = worked_minutes % 60
    text = (
        f"<b>Plecare de la lucrare</b>\n"
        f"Lucrare: {work_order.title}\n"
        f"Muncitor: {user.full_name}\n"
        f"Ora plecare: {_fmt_time(datetime.utcnow())}\n"
        f"Timp lucrat: {hours}h {mins}min"
    )
    return _send(text)


def notify_order_acknowledged(work_order, user, role: str) -> bool:
    """Trimis cand cineva confirma ca a luat la cunostinta comanda."""
    role_label = "Sef Echipa (ACCEPTAT OFICIAL)" if role == "team_leader" else "Muncitor"
    text = (
        f"<b>Comanda confirmata</b>\n"
        f"Lucrare: {work_order.title}\n"
        f"De catre: {user.full_name} ({role_label})\n"
        f"La: {_fmt_time(datetime.utcnow())}"
    )
    return _send(text)


def notify_order_closed(work_order, user) -> bool:
    """Trimis cand o comanda a fost inchisa de muncitor (asteapta semnatura client)."""
    text = (
        f"<b>Lucrare finalizata — asteapta semnatura client</b>\n"
        f"Lucrare: {work_order.title}\n"
        f"Client: {work_order.client_name or '—'}\n"
        f"Finalizata de: {user.full_name}\n"
        f"La: {_fmt_time(datetime.utcnow())}\n"
        f"Urmatorul pas: trimite link-ul clientului pentru semnatura digitala."
    )
    return _send(text)


def notify_client_signed(work_order, signed_by_name: str) -> bool:
    """Trimis cand clientul semneaza digital — lucrarea este complet inchisa."""
    text = (
        f"<b>Client a semnat — lucrare INCHISA</b>\n"
        f"Lucrare: {work_order.title}\n"
        f"Client: {work_order.client_name or '—'}\n"
        f"Semnat de: {signed_by_name}\n"
        f"La: {_fmt_time(datetime.utcnow())}"
    )
    return _send(text)
