"""
HealthQueue+ Custom Rasa Actions
Extend this file to add server-side actions (e.g., fetch live queue data from hq-server API).
"""
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
import requests
import os

HQ_SERVER = os.getenv("HQ_SERVER_URL", "http://localhost:4000/api")


class ActionGetLiveWaitTime(Action):
    """Fetch live wait time from hq-server for a specific clinic."""

    def name(self) -> Text:
        return "action_get_live_wait_time"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        clinic_name = tracker.get_slot("clinic_name")
        try:
            resp = requests.get(f"{HQ_SERVER}/clinics", timeout=5)
            clinics = resp.json() if resp.status_code == 200 else []

            if clinic_name:
                match = next(
                    (c for c in clinics
                     if clinic_name.lower() in c.get("name", "").lower()),
                    None,
                )
            else:
                # Pick the clinic with the lowest wait time
                match = min(
                    (c for c in clinics if c.get("currentWaitingTime", 999) > 0),
                    key=lambda c: c.get("currentWaitingTime", 999),
                    default=None,
                )

            if match:
                name = match.get("name", "the clinic")
                wait = match.get("currentWaitingTime", 0)
                queue = match.get("queueLength", 0)
                dispatcher.utter_message(
                    text=(
                        f"At **{name}**, the current estimated wait time is "
                        f"**~{wait} minutes** with {queue} patient(s) in queue."
                    )
                )
            else:
                dispatcher.utter_message(
                    text="I couldn't fetch live wait time right now. "
                         "Please check the app dashboard for real-time updates."
                )
        except Exception:
            dispatcher.utter_message(
                text="I'm having trouble connecting to the clinic system. "
                     "Please check the app for live queue information."
            )
        return []


class ActionGetClinicHours(Action):
    """Fetch clinic details from hq-server."""

    def name(self) -> Text:
        return "action_get_clinic_hours"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        clinic_name = tracker.get_slot("clinic_name")
        try:
            resp = requests.get(f"{HQ_SERVER}/clinics", timeout=5)
            clinics = resp.json() if resp.status_code == 200 else []

            match = None
            if clinic_name:
                match = next(
                    (c for c in clinics
                     if clinic_name.lower() in c.get("name", "").lower()),
                    None,
                )

            if match:
                name = match.get("name", "the clinic")
                hours = match.get("operatingHours", "Monday–Saturday, 7:00 AM – 5:00 PM")
                dispatcher.utter_message(
                    text=f"**{name}** is open: {hours}."
                )
            else:
                dispatcher.utter_message(
                    text="Hi-Precision branches are generally open "
                         "Monday–Saturday, 7:00 AM – 5:00 PM. "
                         "Please check with your specific branch for exact hours."
                )
        except Exception:
            dispatcher.utter_message(
                text="Most Hi-Precision branches are open Monday–Saturday, "
                     "7 AM to 5 PM. Please call your branch to confirm."
            )
        return []
