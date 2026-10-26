import datetime,copy,unittest
from backtest import indicators,plan,simulate
class EngineTests(unittest.TestCase):
 def setUp(self):
  self.rows=[{'date':(datetime.date(2020,1,1)+datetime.timedelta(days=i)).isoformat(),'open':100+i*.2,'high':100+i*.2+.1,'low':100+i*.2-.1,'close':100+i*.2} for i in range(400)]
 def test_no_future_information(self):
  before=plan(self.rows,indicators(self.rows),252,'breakout');changed=copy.deepcopy(self.rows)
  for r in changed[253:]:
   for k in ['open','high','low','close']:r[k]*=10
  self.assertEqual(before,plan(changed,indicators(changed),252,'breakout'))
 def test_stop_first_and_cost(self):
  rows=self.rows;p=plan(rows,indicators(rows),252,'breakout');self.assertIsNotNone(p)
  rows[253].update(open=p['entry'],high=p['target']+1,low=p['stop']-1,close=p['entry'])
  ind=indicators(rows);m,tr,_=simulate(rows,ind,'breakout',253,254)
  self.assertEqual(len(tr),1);self.assertEqual(tr[0]['reason'],'Stop');self.assertLess(tr[0]['pnl'],0)
  self.assertLess(simulate(rows,ind,'breakout',253,254,.002)[0]['returnPct'],m['returnPct'])
 def test_unfilled_order(self):
  p=plan(self.rows,indicators(self.rows),252,'breakout');v=p['entry']-1
  self.rows[253].update(open=v,high=v,low=v,close=v)
  self.assertEqual(simulate(self.rows,indicators(self.rows),'breakout',253,254)[0]['trades'],0)
 def test_large_gap_cancelled(self):
  p=plan(self.rows,indicators(self.rows),252,'breakout');v=p['entry']+p['atr']*2
  self.rows[253].update(open=v,high=v+.1,low=v-.1,close=v)
  self.assertEqual(simulate(self.rows,indicators(self.rows),'breakout',253,254)[0]['trades'],0)
if __name__=='__main__':unittest.main()
