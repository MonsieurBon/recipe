import { LocalStorage } from './local-storage';

describe('Localstorage', () => {
  let service: LocalStorage;

  beforeEach(() => {
    service = new LocalStorage();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store a value in localStorage', () => {
    const value = {
      foo: 'bar',
    };
    service.setItem('key', value);
    const returnedValue = service.getItem('key');
    expect(returnedValue).toEqual(value);
  });
});
