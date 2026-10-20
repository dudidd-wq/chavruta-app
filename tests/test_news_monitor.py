import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

try:
    from chavruta import monitor
except ImportError:
    monitor = None


@unittest.skipIf(monitor is None, 'collector dependencies are installed in the daily CI job')
class MonitorTests(unittest.TestCase):
    def test_retry_after_for_rate_limit_is_bounded(self):
        from unittest.mock import Mock
        limited = Mock(status_code=429, headers={'Retry-After':'999'})
        good = Mock(status_code=200)
        with patch.object(monitor.requests, 'get', side_effect=[limited, good]), patch.object(monitor.time, 'sleep') as sleep:
            self.assertIs(monitor._get('https://example.org'), good)
            self.assertTrue(any(c.args == (30,) for c in sleep.call_args_list))

    def test_failure_retains_last_good_items_and_does_not_reset_discovery(self):
        with tempfile.TemporaryDirectory() as tmp:
            mon = Path(tmp)
            old = {'id':'s','name':'Source','role':'analysis','status':'ok','checked_at':'2026-10-01T00:00:00Z',
                   'new':[], 'total':1,'latest':[{'id':'a','title':'Article','url':'https://example.org/a','first_seen':'2026-09-30T00:00:00Z'}]}
            (mon/'snapshot.json').write_text(json.dumps({'sources':[old]}),encoding='utf-8')
            failed={**old,'status':'error','checked_at':'2026-10-20T00:00:00Z','latest':[],'error':'timeout'}
            with patch.object(monitor,'MON',mon),patch.object(monitor,'sources',return_value=[{'id':'s'}]),patch.object(monitor,'check',return_value=failed):
                got=monitor.run()['sources'][0]
            self.assertTrue(got['retained'])
            self.assertEqual(got['latest'][0]['first_seen'],'2026-09-30T00:00:00Z')
            self.assertEqual(got['last_success_at'],'2026-10-01T00:00:00Z')

    def test_new_items_get_current_first_seen_while_old_links_keep_theirs(self):
        with tempfile.TemporaryDirectory() as tmp:
            mon=Path(tmp)
            old={'id':'s','name':'Source','role':'analysis','status':'ok','checked_at':'2026-10-01T00:00:00Z','new':[], 'total':1,
                 'latest':[{'id':'old','title':'Old','url':'https://example.org/old','first_seen':'2026-09-30T00:00:00Z'}]}
            (mon/'snapshot.json').write_text(json.dumps({'sources':[old]}),encoding='utf-8')
            fresh={**old,'checked_at':'2026-10-20T00:00:00Z','latest':[{'id':'new','title':'New','url':'https://example.org/new'}]}
            with patch.object(monitor,'MON',mon),patch.object(monitor,'sources',return_value=[{'id':'s'}]),patch.object(monitor,'check',return_value=fresh):
                items=monitor.run()['sources'][0]['latest']
            self.assertEqual(items[0]['first_seen'],'2026-10-20T00:00:00Z')
            self.assertEqual(items[1]['first_seen'],'2026-09-30T00:00:00Z')


if __name__=='__main__': unittest.main()
