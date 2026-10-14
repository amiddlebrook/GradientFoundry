import importlib.util, pathlib, unittest
path=pathlib.Path(__file__).resolve().parents[1]/'trainer/train.py'
spec=importlib.util.spec_from_file_location('foundry_trainer',path)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class Tests(unittest.TestCase):
 def test_deterministic(self):
  records=[{'text':v,'label':l} for v,l in [('refund now','refund'),('want money back','refund'),('return this','refund'),('send invoice','billing'),('receipt please','billing'),('billing issue','billing')]]
  a=mod.train(records,seed=8,epochs=5);b=mod.train(records,seed=8,epochs=5)
  self.assertEqual(a,b)
  self.assertEqual(len(a['history']),5)
 def test_features(self):
  self.assertAlmostEqual(sum(mod.features('one two two').values()),1.0)
if __name__=='__main__': unittest.main()
