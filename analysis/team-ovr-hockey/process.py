import glob
import json
import matplotlib.pyplot as plt  
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

def get_cols():
    cols = {
        'C1': [],
        'C2': [],
        'C3': [],
        'C4': [],
        'W1': [],
        'W2': [],
        'W3': [],
        'W4': [],
        'W5': [],
        'W6': [],
        'W7': [],
        'W8': [],
        'D1': [],
        'D2': [],
        'D3': [],
        'D4': [],
        'D5': [],
        'D6': [],
        'G': [],
        "diff": [],
    }

    files = glob.glob('data*.json')
    files.sort()
    print(files)

    for file in files:
        with open(file, "r", encoding='utf-8-sig') as read_file:
            data = json.load(read_file)

        def get_ovrs(tid, season):
            ovrs_by_pos = {
                'C': [],
                'W': [],
                'D': [],
                'G': [],
            }

            for p in data['players']:
                if tid in p['statsTids']:
                    for ps in p['stats']:
                        if ps['season'] == season and ps['tid'] == tid:
                            found_ratings = False
                            for pr in p['ratings']:
                                if pr['season'] == season:
                                    found_ratings = True
                                    ovrs_by_pos[pr['pos']].append(pr['ovr'])
                                    break
                            if not found_ratings:
                                raise Exception("No ratings found")
                            break
                        elif ps['season'] > season:
                            break

            for key in ovrs_by_pos.keys():
                ovrs_by_pos[key].sort(reverse=True)

            return ovrs_by_pos

        for t in data['teams']:
            tid = t['tid']
            for ts in t['stats']:
                if not ts['playoffs'] and ts['gp'] > 0:
                    season = ts['season']
                    diff = ts['pts'] - ts['oppPts'];
                    cols['diff'].append(diff)

                    ovrs = get_ovrs(tid, season)

                    default_ovr = 20

                    cols['C1'].append(ovrs['C'][0] if len(ovrs['C']) >= 1 else default_ovr)
                    cols['C2'].append(ovrs['C'][1] if len(ovrs['C']) >= 2 else default_ovr)
                    cols['C3'].append(ovrs['C'][2] if len(ovrs['C']) >= 3 else default_ovr)
                    cols['C4'].append(ovrs['C'][3] if len(ovrs['C']) >= 4 else default_ovr)
                    cols['W1'].append(ovrs['W'][0] if len(ovrs['W']) >= 1 else default_ovr)
                    cols['W2'].append(ovrs['W'][1] if len(ovrs['W']) >= 2 else default_ovr)
                    cols['W3'].append(ovrs['W'][2] if len(ovrs['W']) >= 3 else default_ovr)
                    cols['W4'].append(ovrs['W'][3] if len(ovrs['W']) >= 4 else default_ovr)
                    cols['W5'].append(ovrs['W'][4] if len(ovrs['W']) >= 5 else default_ovr)
                    cols['W6'].append(ovrs['W'][5] if len(ovrs['W']) >= 6 else default_ovr)
                    cols['W7'].append(ovrs['W'][6] if len(ovrs['W']) >= 7 else default_ovr)
                    cols['W8'].append(ovrs['W'][7] if len(ovrs['W']) >= 8 else default_ovr)
                    cols['D1'].append(ovrs['D'][0] if len(ovrs['D']) >= 1 else default_ovr)
                    cols['D2'].append(ovrs['D'][1] if len(ovrs['D']) >= 2 else default_ovr)
                    cols['D3'].append(ovrs['D'][2] if len(ovrs['D']) >= 3 else default_ovr)
                    cols['D4'].append(ovrs['D'][3] if len(ovrs['D']) >= 4 else default_ovr)
                    cols['D5'].append(ovrs['D'][4] if len(ovrs['D']) >= 5 else default_ovr)
                    cols['D6'].append(ovrs['D'][5] if len(ovrs['D']) >= 6 else default_ovr)
                    cols['G'].append(ovrs['G'][0] if len(ovrs['G']) >= 1 else default_ovr)

    return cols

cols = get_cols()

dataset = pd.DataFrame(cols)

reg = LinearRegression(normalize=True)
fit_cols = ['C1', 'C2', 'C3', 'C4', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'G']
reg.fit(dataset[fit_cols], dataset['diff'])
dataset['diff_predicted'] = reg.predict(dataset[fit_cols])

print('Intercept: \n', reg.intercept_)
print('Coefficients: \n', reg.coef_)
print('r2: ', r2_score(dataset['diff'], dataset['diff_predicted']))

print(dataset)


dataset.plot.hexbin(x='diff', y='diff_predicted', gridsize=20)
# dataset.plot.scatter(x='diff', y='diff_predicted', alpha=0.2)
plt.xlabel('Actual GF-GA')  
plt.ylabel('Predicted GF-GA')  

# plt.plot([-2, 2], [-2, 2])

plt.show()
