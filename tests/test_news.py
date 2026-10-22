import unittest
import importlib.util
import tempfile
import json
from unittest.mock import patch
from pathlib import Path
from datetime import datetime, timezone, timedelta
from chavruta import news

NOW = datetime(2026, 10, 20, 8, tzinfo=timezone.utc)


class NewsTests(unittest.TestCase):
    def fixture(self, date='2026-10-18', medium='text'):
        raw = {'id': 'a', 'title': 'מאמר חדש', 'url': 'https://example.org/a', 'date': date}
        src = {'id': 'source', 'name': 'מקור', 'role': 'primary', 'medium': medium,
               'status': 'ok', 'checked_at': '2026-10-18T08:00:00Z', 'latest': [raw]}
        key = news.item_key(raw)
        snap = {'generated_at': '2026-10-18T08:00:00Z', 'sources': [src]}
        return snap, key

    def test_unchecked_summary_is_not_published(self):
        snap, key = self.fixture()
        f = news.project(snap, {key: {'cls': 'מקור'}}, {key: {'he': 'unapproved', 'checked': False}}, {}, now=NOW)
        self.assertEqual(f['items'][0]['summary'], '')
        f = news.project(snap, {key: {'cls': 'מקור'}}, {key: {'he': 'approved', 'checked': True}}, {}, now=NOW)
        self.assertEqual(news.pack(f)['items'][0]['s'], 'approved')

    def test_discovery_does_not_become_publication_date(self):
        snap, key = self.fixture('')
        f = news.project(snap, {key: {'cls': 'מקור'}}, {}, {}, now=NOW)
        item = news.pack(f)['items'][0]
        self.assertEqual(item['dateKind'], 'discovered')
        self.assertEqual(item['d'], '')
        self.assertTrue(item['seen'].startswith('2026-10-18'))

    def test_undated_item_expires_even_after_a_new_scan(self):
        snap, key = self.fixture('')
        observed = {}
        news.project(snap, {}, {}, observed, now=NOW, filtered=False)
        snap['sources'][0]['checked_at'] = '2026-12-01T00:00:00Z'
        f = news.project(snap, {key: {'cls': 'מקור'}}, {}, observed, now=NOW + timedelta(days=42))
        self.assertEqual(f['items'], [])
        self.assertTrue(observed[key].startswith('2026-10-18'))

    def test_browser_observation_is_not_a_publication_date(self):
        snap, key = self.fixture('')
        raw = snap['sources'][0]['latest'].pop()
        raw['date'] = '2026-10-12'
        snap['browser_checks'] = {'source': {'checked_at': '2026-10-18T00:00:00Z', 'items': [raw]}}
        f = news.project(snap, {key: {'cls': 'מקור'}}, {}, {}, now=NOW)
        self.assertEqual(f['items'][0]['date_kind'], 'discovered')
        self.assertTrue(f['items'][0]['first_seen'].startswith('2026-10-12'))

    def test_old_and_future_publications_are_not_new(self):
        for date in ('2026-08-01', '2027-01-01'):
            snap, key = self.fixture(date)
            self.assertEqual(news.project(snap, {key: {'cls': 'מקור'}}, {}, {}, now=NOW)['items'], [])

    def test_synthetic_catalog_day_is_not_a_publication_date(self):
        snap, key = self.fixture('2026-10-18')
        snap['sources'][0]['detect'] = 'kehot'
        f = news.project(snap, {key: {'cls': 'מקור'}}, {}, {}, now=NOW)
        self.assertIsNone(f['items'][0]['date'])
        self.assertEqual(f['items'][0]['date_kind'], 'discovered')

    def test_unknown_and_spoken_content_are_not_published(self):
        snap, key = self.fixture()
        self.assertEqual(news.project(snap, {}, {}, {}, now=NOW)['n_unclassified'], 1)
        snap['sources'][0]['medium'] = 'podcast'
        self.assertEqual(news.project(snap, {key: {'cls': 'מקור'}}, {}, {}, now=NOW)['items'], [])

    def test_failed_source_retains_item_without_success_claim(self):
        snap, key = self.fixture()
        snap['sources'][0].update(status='error', retained=True, last_success_at='2026-10-18T08:00:00Z')
        f = news.project(snap, {key: {'cls': 'מקור'}}, {}, {}, now=NOW)
        self.assertTrue(news.pack(f)['items'][0]['stale'])
        self.assertEqual(f['counts'], {'error': 1})

    def test_deduplication_and_unsafe_urls(self):
        snap, key = self.fixture()
        snap['sources'][0]['latest'] *= 2
        self.assertEqual(len(news.project(snap, {key: {'cls': 'מקור'}}, {}, {}, now=NOW)['items']), 1)
        snap['sources'][0]['latest'][0]['url'] = 'javascript:alert(1)'
        self.assertEqual(news.project(snap, {}, {}, {}, now=NOW)['items'], [])

    def test_style_only_reference_is_not_a_news_candidate(self):
        snap, key = self.fixture()
        snap['sources'][0]['id'] = 'taam_hachaim'
        f = news.project(snap, {key: {'cls': 'ביאור'}}, {}, {}, now=NOW, filtered=False)
        self.assertEqual(f['items'], [])
        self.assertEqual(f['sources'], 0)

    def test_download_button_is_not_an_identified_publication(self):
        snap, key = self.fixture(medium='bulletin')
        snap['sources'][0]['latest'][0]['title'] = 'Download'
        f = news.project(snap, {}, {}, {}, now=NOW)
        self.assertEqual(f['items'], [])
        self.assertEqual(f['n_unclassified'], 1)

    def test_generic_titles_keep_explicit_exclusion_decisions(self):
        for title in ('Download', ' download PDF ', 'PDF', 'Read More', 'להורדה', 'הורדה', 'לחצו כאן'):
            for cls in ('כפול', 'לא רלוונטי', 'ישן'):
                with self.subTest(title=title, cls=cls):
                    snap, _ = self.fixture(medium='bulletin')
                    raw = snap['sources'][0]['latest'][0]
                    raw['title'] = title
                    key = news.item_key(raw)
                    f = news.project(snap, {key: {'cls': cls}}, {}, {}, now=NOW)
                    self.assertEqual(f['items'], [])
                    self.assertEqual(f['n_unclassified'], 0)
                    all_items = news.project(snap, {key: {'cls': cls}}, {}, {}, now=NOW, filtered=False)['items']
                    self.assertEqual(all_items[0]['cls'], cls)

    def test_generic_titles_cannot_be_published_by_positive_or_unknown_classification(self):
        for cls in ('מקור', 'ביאור', 'גיליון', 'unknown', ''):
            with self.subTest(cls=cls):
                snap, _ = self.fixture(medium='bulletin')
                raw = snap['sources'][0]['latest'][0]
                raw['title'] = 'Download'
                key = news.item_key(raw)
                f = news.project(snap, {key: {'cls': cls}}, {}, {}, now=NOW)
                self.assertEqual(f['items'], [])
                self.assertEqual(f['n_unclassified'], 1)

    def test_repeated_updates_keep_identified_sie_items_without_requeuing_duplicates(self):
        path = Path(__file__).resolve().parents[1] / 'tools/app/update_news.py'
        spec = importlib.util.spec_from_file_location('news_update_sie_test', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        first_seen = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        generic, identified, relevance, summaries = [], [], {}, {}
        observations = {}
        for title, file_id in (('Noach', '1QzULk5KamxPtFQF3IdLa9CxSzaWEUUZ5'),
                               ('Lech Lecha', '1HqbBVAs0OF_E2U40N2NuVpBzZsoKUHAJ')):
            raw = {'title': 'Download', 'url': f'https://drive.google.com/file/d/{file_id}/view', 'first_seen': first_seen}
            named = {**raw, 'title': f'SIE Weekly · {title} · Likkutei Sichos Volume 3'}
            generic.append(raw)
            identified.append(named)
            relevance[news.item_key(raw)] = {'cls': 'כפול'}
            relevance[news.item_key(named)] = {'cls': 'מקור'}
            summaries[news.item_key(named)] = {'he': 'draft', 'checked': False}
            observations.update({news.item_key(raw): first_seen, news.item_key(named): first_seen})
        src = {'id': 'sie_weekly', 'name': 'SIE Weekly', 'role': 'analysis', 'medium': 'bulletin',
               'status': 'ok', 'checked_at': first_seen, 'latest': generic}
        snapshot = {'generated_at': first_seen, 'sources': [src],
                    'browser_checks': {'sie_weekly': {'checked_at': first_seen, 'items': identified}}}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mon = root / 'data/monitor'
            mon.mkdir(parents=True)
            for name, value in (('snapshot', snapshot), ('relevance', relevance), ('summaries', summaries), ('observations', observations)):
                (mon / f'{name}.json').write_text(json.dumps(value), encoding='utf-8')
            with patch.object(module, 'ROOT', root), patch.object(news, 'source_media', return_value={}):
                for _ in range(2):
                    payload = module.update(root / 'data')
                    self.assertEqual(json.loads((mon / 'pending.json').read_text()), [])
                    self.assertEqual(json.loads((mon / 'health.json').read_text())['pending'], 0)
                    self.assertEqual({i['id'] for i in payload['items']}, {news.item_key(i) for i in identified})
                    self.assertTrue(all(i['s'] == '' and not i['checked'] for i in payload['items']))
                    self.assertEqual(json.loads((mon / 'observations.json').read_text()), observations)

    def test_old_bulletin_year_does_not_become_a_new_issue(self):
        snap, key = self.fixture(medium='bulletin')
        snap['sources'][0]['latest'][0]['title'] = 'Pinchas · 5782 · Weekly'
        f = news.project(snap, {}, {}, {}, now=NOW)
        self.assertEqual(f['items'], [])
        self.assertEqual(f['n_reupload'], 1)

    def test_new_scan_changes_the_browser_news_cache_version(self):
        path = Path(__file__).resolve().parents[1] / 'tools/app/update_news.py'
        spec = importlib.util.spec_from_file_location('news_update_test', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]) as tmp:
            index = Path(tmp) / 'index.html'
            index.write_text('<html><head></head><body></body></html>', encoding='utf-8')
            module.stamp_news_version(index, {'generated':'first','items':[]})
            first = index.read_text(encoding='utf-8')
            module.stamp_news_version(index, {'generated':'second','items':[]})
            second = index.read_text(encoding='utf-8')
            self.assertNotEqual(first, second)
            self.assertEqual(second.count('name="chavruta-news-version"'), 1)


if __name__ == '__main__':
    unittest.main()

